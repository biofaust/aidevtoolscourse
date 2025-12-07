import { headlessRunCode } from '@runno/runtime';

/* eslint-disable no-restricted-globals */
const formatResult = (result) => {
  if (!result) return 'No output.';
  if (result.resultType === 'timeout') return 'Execution timed out.';
  if (result.resultType === 'terminated') return 'Execution terminated.';
  if (result.resultType === 'crash') return `Runtime crash: ${result.error?.message || 'Unknown error'}`;

  const out = [];
  if (result.stdout?.trim()) out.push(result.stdout.trim());
  if (result.stderr?.trim()) out.push(`stderr:\n${result.stderr.trim()}`);
  if (!out.length) out.push('Program finished with no output.');
  return out.join('\n\n');
};

let tsModule;
const transpileTypescript = async (code) => {
  if (!tsModule) {
    tsModule = await import('https://esm.sh/typescript@5.6.3');
  }
  const transpiled = tsModule.transpileModule(code, { compilerOptions: { module: 'esnext' } });
  return transpiled.outputText;
};

const execute = async (language, code) => {
  if (language === 'typescript') {
    const js = await transpileTypescript(code);
    const result = await headlessRunCode('quickjs', js);
    return formatResult(result);
  }

  if (language === 'javascript') {
    const result = await headlessRunCode('quickjs', code);
    return formatResult(result);
  }

  if (language === 'python') {
    const result = await headlessRunCode('python', code);
    return formatResult(result);
  }

  if (language === 'cpp') {
    // clangpp compiles and runs the produced binary within WASI
    const result = await headlessRunCode('clangpp', code);
    return formatResult(result);
  }

  return 'Execution not supported for this language.';
};

self.onmessage = async (event) => {
  const { code, language } = event.data || {};
  if (!code) return;

  try {
    const payload = await Promise.race([
      execute(language, code),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Execution timed out')), 8000)),
    ]);
    self.postMessage({ payload });
  } catch (error) {
    self.postMessage({ payload: `Error: ${error.message}` });
  }
};
