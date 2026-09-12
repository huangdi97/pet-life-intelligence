"""Red-flag rule engine unit tests (PLI-053): every rule has a positive and
negative control; max_level never downgrades; engine is deterministic."""

import pytest
from pli_rules import RuleEngine, get_engine, max_level


@pytest.fixture(scope="module")
def engine():
    return get_engine()


def test_engine_metadata(engine):
    assert engine.engine_name == "pli_red_flag_engine"
    assert engine.engine_version
    ids = [r.rule_id for r in engine.rules]
    assert len(ids) == len(set(ids)), "duplicate rule_id"
    for r in engine.rules:
        assert r.version
        assert r.triage in {"MONITOR", "VET_SOON", "URGENT", "EMERGENCY"}
        assert len(r.any_keywords) >= 3, f"{r.rule_id} too few keywords"


POSITIVE_CASES = [
    ("RF-RESP", "dog", "他现在呼吸困难，舌头有点发紫"),
    ("RF-RESP", "cat", "cat is struggling to breathe and gums look purple"),
    ("RF-COLLAPSE", "dog", "突然晕倒，叫不醒"),
    ("RF-COLLAPSE", "cat", "found her collapsed and unresponsive"),
    ("RF-SEIZURE", "dog", "抽搐一直不停，已经超过五分钟"),
    ("RF-SEIZURE", "dog", "今天已经第三次了，repeated seizures"),
    ("RF-BLEED", "dog", "伤口血流不止"),
    ("RF-BLEED", "cat", "coughing up blood since this morning"),
    ("RF-TOXIN", "dog", "刚刚偷吃了一板巧克力"),
    ("RF-TOXIN", "dog", "ate grapes from the counter"),
    ("RF-TOXIN", "cat", "可能舔到了老鼠药"),
    ("RF-BLOAT", "dog", "肚子突然胀大，一直干呕吐不出来"),
    ("RF-UOBSTRUCTION", "cat", "反复进猫砂盆但几乎尿不出来"),
    ("RF-UOBSTRUCTION", "cat", "straining in litter box with no urine coming out"),
    ("RF-TRAUMA", "dog", "今天被车撞了"),
    ("RF-TRAUMA", "cat", "fell from height, 从六楼摔下来"),
]


@pytest.mark.parametrize(("rule_id", "species", "text"), POSITIVE_CASES)
def test_rule_positive(engine, rule_id, species, text):
    result = engine.evaluate(species, text)
    hit_ids = {h.rule_id for h in result.hits}
    assert rule_id in hit_ids, f"{rule_id} did not trigger on: {text}"


NEGATIVE_CASES = [
    ("RF-RESP", "dog", "今天胃口不错，玩得很开心"),
    ("RF-RESP", "dog", "breathing normally after a walk"),
    ("RF-COLLAPSE", "dog", "睡得比平时多但可以叫醒，走路正常"),
    ("RF-SEIZURE", "dog", "睡觉时腿偶尔抖动，醒着时正常"),  # sleep twitch ≠ seizure
    ("RF-BLEED", "dog", "小爪子破了一点皮，已经结痂"),
    ("RF-TOXIN", "dog", "吃了狗粮和鸡胸肉，没有异常"),
    ("RF-BLOAT", "dog", "肚子摸起来软软的，吃得好睡得好"),
    ("RF-BLOAT", "cat", "猫反复蹲猫砂盆尿不出来"),  # species-gated to dog
    ("RF-UOBSTRUCTION", "dog", "狗排尿正常"),  # species-gated to cat
    ("RF-TRAUMA", "dog", "在沙发上摔下来一小步，没事"),
]


@pytest.mark.parametrize(("rule_id", "species", "text"), NEGATIVE_CASES)
def test_rule_negative(engine, rule_id, species, text):
    result = engine.evaluate(species, text)
    hit_ids = {h.rule_id for h in result.hits}
    assert rule_id not in hit_ids, f"{rule_id} false-positived on: {text}"


def test_no_red_flag_means_monitor_not_disease_free(engine):
    """docs/05: 未发现红旗 ≠ 没有疾病 — baseline level is MONITOR, wording
    stays neutral."""
    result = engine.evaluate("dog", "有点拉肚子但精神不错")
    assert result.triage_level == "MONITOR"


def test_max_level_never_downgrades():
    assert max_level("MONITOR", "EMERGENCY") == "EMERGENCY"
    assert max_level("EMERGENCY", "MONITOR") == "EMERGENCY"
    assert max_level("URGENT", "VET_SOON") == "URGENT"
    assert max_level("MONITOR", "MONITOR") == "MONITOR"


def test_engine_deterministic(engine):
    a = engine.evaluate("dog", "被车撞了，呼吸困难")
    b = engine.evaluate("dog", "被车撞了，呼吸困难")
    assert a.to_dict() == b.to_dict()


def test_multi_text_combination(engine):
    # red flag spread across two separate texts must still be caught
    result = engine.evaluate("cat", ["最近食欲一般", "反复进猫砂盆但几乎尿不出来"])
    assert any(h.rule_id == "RF-UOBSTRUCTION" for h in result.hits)


def test_species_gate():
    engine = get_engine()
    dog_only = [r for r in engine.rules if r.rule_id == "RF-BLOAT"][0]
    assert dog_only.matches("cat", "肚子胀大干呕") == []
    assert dog_only.matches("dog", "肚子胀大干呕") != []


def test_engine_rejects_bad_data():
    with pytest.raises(ValueError):
        RuleEngine({"engine_name": "x", "engine_version": "1", "rules": [
            {"rule_id": "A", "version": "1", "species": ["dog"],
             "triage": "URGENT", "description": "", "any_keywords": ["a"]},
            {"rule_id": "A", "version": "1", "species": ["dog"],
             "triage": "URGENT", "description": "", "any_keywords": ["b"]},
        ]})
