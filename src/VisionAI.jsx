import { useState } from "react";

export default function VisionAI() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  const run = () => {
    setResult(input ? "processed: " + input : "");
  };

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={run}>run</button>
      <div>{result}</div>
    </div>
  );
}
