import { Text, View } from "@tarojs/components";

interface Props {
  summary: string;
  evidence?: string;
  unknown?: boolean;
}

/** Today CHANGE layer: this pet versus its own recorded baseline.
 * It stays visually quieter than health Attention because ordinary variance
 * is not itself a medical warning. */
export function ChangeNarrative({ summary, evidence, unknown = false }: Props) {
  return (
    <View
      className={`change-narrative${unknown ? " change-narrative-unknown" : ""}`}
      data-testid="pli.mini.today.change"
    >
      <Text className="change-kicker">与它自己相比</Text>
      <Text className="change-summary">{summary}</Text>
      {evidence ? <Text className="change-evidence">{evidence}</Text> : null}
    </View>
  );
}
