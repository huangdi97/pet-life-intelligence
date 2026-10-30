"use strict";
/** Run R8AI's REAL pure owner Case status mapping, not a copied test helper. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync(path.resolve(__dirname, "../src/components/life/ownerCaseHistory.ts"),"utf8");
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const shim={exports:{}};
new Function("module","exports",compiled)(shim,shim.exports);
const {caseHistoryStatus,caseHistoryNeedsAttention,caseHistoryNextAction,caseHistoryMetric}=shim.exports;
const origin={pet_id:"pet-1",case_id:"case-A",metric:"walk_minutes_per_day",current_value:20,baseline_value:90,sample_days:5,evidence_event_ids:["e1","e2"],source_valid:true,state:"PROPOSED"};
assert.equal(caseHistoryStatus(origin),"等待主人核对");
assert.match(caseHistoryStatus({...origin,state:"FOLLOW_UP",follow_up_source_valid:true}),/真实后续观察/);
assert.match(caseHistoryStatus({...origin,state:"FOLLOW_UP",follow_up_source_valid:null}),/继续关注/);
assert.match(caseHistoryStatus({...origin,state:"FOLLOW_UP_EVIDENCE_INVALIDATED",follow_up_source_valid:false}),/已失效/);
assert.match(caseHistoryStatus({...origin,state:"INVALIDATED",source_valid:false}),/原始记录已变更/);
assert.equal(caseHistoryStatus({...origin,state:"CLOSED"}),"主人选择暂不关注");
assert.equal(caseHistoryStatus({...origin,state:"CLOSED",follow_up_source_valid:true}),"主人选择暂不关注");
assert.equal(caseHistoryStatus({...origin,state:"CLOSED",follow_up_source_valid:false}),"主人选择暂不关注");
assert.equal(caseHistoryStatus({...origin,state:"OWNER_ACKNOWLEDGED",follow_up_source_valid:false}),"主人已提出来源核对");
assert.equal(caseHistoryStatus({...origin,state:"OWNER_ACKNOWLEDGED",follow_up_source_valid:true}),"主人已提出来源核对");
assert.equal(caseHistoryStatus({...origin,state:"OWNER_ACKNOWLEDGED"}),"主人已提出来源核对");
assert.equal(caseHistoryStatus({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"OUTCOME_CONTINUE_OBSERVING",owner_workflow_source:"OUTCOME"}),"主人选择继续观察");
assert.match(caseHistoryStatus({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"OUTCOME_NO_LONGER_CONCERNED",owner_workflow_source:"OUTCOME"}),/非恢复结论/);
assert.equal(caseHistoryStatus({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"OUTCOME_NEEDS_FURTHER_FOLLOW_UP",owner_workflow_source:"OUTCOME"}),"主人选择进一步跟进");
assert.match(caseHistoryStatus({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"FOLLOW_UP_EVIDENCE_INVALIDATED",follow_up_source_valid:false}),/新的真实观察/);
assert.equal(caseHistoryStatus({...origin,state:"CLOSED",owner_workflow_state:"CLOSED",follow_up_source_valid:false}),"主人选择暂不关注");
assert.equal(caseHistoryNeedsAttention({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"OUTCOME_CONTINUE_OBSERVING"}),false);
assert.equal(caseHistoryNeedsAttention({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"FOLLOW_UP_EVIDENCE_INVALIDATED",follow_up_source_valid:false}),true);
assert.equal(caseHistoryNeedsAttention({...origin,state:"CLOSED",owner_workflow_state:"CLOSED",follow_up_source_valid:false}),false);
assert.deepEqual(
  caseHistoryNextAction({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"FOLLOW_UP_EVIDENCE_INVALIDATED",follow_up_source_valid:false}),
  {
    kind:"RECORD_OBSERVATION",
    label:"补一条新的真实散步记录",
    note:"旧主人判断仍保留为历史；新结果必须基于新的真实观察。",
  },
);
assert.equal(
  caseHistoryNextAction({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"OUTCOME_CONTINUE_OBSERVING"}).kind,
  "RECORD_OBSERVATION",
);
assert.match(
  caseHistoryNextAction({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"OUTCOME_CONTINUE_OBSERVING"}).note,
  /不要求连续打卡/,
);
assert.equal(
  caseHistoryNextAction({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"OUTCOME_NEEDS_FURTHER_FOLLOW_UP"}).kind,
  "RECORD_OBSERVATION",
);
assert.match(
  caseHistoryNextAction({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"OUTCOME_NEEDS_FURTHER_FOLLOW_UP"}).note,
  /不自动表示健康风险等级更高/,
);
assert.deepEqual(
  caseHistoryNextAction({...origin,state:"OWNER_ACKNOWLEDGED",owner_workflow_state:"OUTCOME_NO_LONGER_CONCERNED"}),
  {
    kind:"NONE",
    label:"当前没有待办",
    note:"这只是主人当前选择，不等于宠物已恢复、正常或没有健康问题。",
  },
);
assert.equal(
  caseHistoryNextAction({...origin,state:"CLOSED",owner_workflow_state:"CLOSED",follow_up_source_valid:false}).kind,
  "NONE",
);
assert.equal(
  caseHistoryNextAction({...origin,state:"INVALIDATED",owner_workflow_state:"INVALIDATED",source_valid:false}).kind,
  "OPEN_CASE",
);
assert.equal(
  caseHistoryNextAction({...origin,state:"FOLLOW_UP",follow_up_source_valid:true}).label,
  "回看后续观察并记录结果",
);
assert.equal(caseHistoryMetric("daily.other").name,"生活记录");
assert.equal(caseHistoryMetric("walk_minutes_per_day").unit,"分钟");
const today = fs.readFileSync(path.resolve(__dirname,"../src/screens/TodayScreen.tsx"),"utf8");
assert.ok(today.includes("ownerCases.length > 0"));
assert.ok(today.includes("isOwnData ? rawOwnerCases : []"));
assert.ok(today.includes("onRecordObservation={(item) =>"));
assert.ok(today.includes("lifeChangeCaseId: item.case_id"));
const compactHistory = fs.readFileSync(path.resolve(__dirname,"../src/components/life/OwnerChangeHistory.tsx"),"utf8");
assert.ok(compactHistory.includes("caseHistoryNextAction(c)"));
assert.ok(compactHistory.includes("pli.r8.owner-history.next-record."));
const fullHistory = fs.readFileSync(path.resolve(__dirname,"../src/screens/LifeChangeHistoryScreen.tsx"),"utf8");
assert.ok(fullHistory.includes("caseHistoryNextAction(item)"));
assert.ok(fullHistory.includes("pli.r8.history.next-record."));
const caseDetail = fs.readFileSync(path.resolve(__dirname,"../src/screens/LifeChangeCaseScreen.tsx"),"utf8");
assert.ok(caseDetail.includes("caseHistoryNextAction(detail)"));
assert.ok(caseDetail.includes('testID="pli.r8.case-detail.next-record"'));
const lifeView = fs.readFileSync(path.resolve(__dirname,"../src/screens/LifeViewScreen.tsx"),"utf8");
assert.ok(lifeView.includes("owner_workflows?: LifeChangeCaseSummary[]"));
assert.ok(lifeView.includes('testID="pli.lifeview.replay.owner-workflows"'));
assert.ok(lifeView.includes("caseHistoryStatus(item)"));
assert.ok(lifeView.includes("caseHistoryNeedsAttention(item)"));
assert.ok(lifeView.includes("历史页面只读，不从过去直接发起今天的动作"));
assert.ok(!lifeView.includes('testID="pli.lifeview.replay.owner-workflows" onPress='));
console.log("R8AI/R8BY/R8BZ/R8CA Case journal + workflow + next action + replay wiring: PASS");
