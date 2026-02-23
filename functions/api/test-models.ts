/**
 * Temporary endpoint to test Workers AI models. DELETE AFTER TESTING.
 */
interface Env {
  AI: Ai;
}

const MODELS = [
  '@cf/google/gemma-3-12b-it',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  '@cf/zhipuai/glm-4.7-flash',
  '@cf/meta/llama-3.1-8b-instruct',
];

const SYSTEM = 'You are Sol, a warm narrator for The Realm of Patterns. Write a 2-sentence energy reading for today. Be specific and personal.';
const USER = 'Natal: The Sage, strongest Mind (78%), shadow Warrior (Drive 45%). Today transit: Awareness dominant (72%). Alignment: 68%. Streak: 5 days.';

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const results: Array<{ name: string; ms: number; text: string }> = [];

  for (const model of MODELS) {
    const name = model.split('/').pop() || model;
    const start = Date.now();
    try {
      const result = await context.env.AI.run(model as any, {
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: USER },
        ],
        temperature: 0.85,
        max_tokens: 300,
      }) as any;
      const ms = Date.now() - start;
      results.push({ name, ms, text: result?.response || 'empty response' });
    } catch (e) {
      results.push({ name, ms: Date.now() - start, text: 'ERROR: ' + (e as Error).message });
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
