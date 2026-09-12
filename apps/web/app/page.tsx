const cards = [
  ["Today", "记录今天发生了什么"],
  ["Timeline", "查看同一只宠物的连续历史"],
  ["Care", "家庭任务与照护交接"],
  ["Behavior", "记录可观察行为"],
  ["Health", "从异常到 Vet Brief 与 Outcome"]
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">PET LIFE INTELLIGENCE · v0.1 BOOTSTRAP</div>
        <h1>Coco 今天怎么样？</h1>
        <p>当前页面只是 bootstrap 存活页。执行 Agent 应按 GOAL 将它替换为真实 Today。</p>
      </section>

      <section className="grid">
        {cards.map(([title, text]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
