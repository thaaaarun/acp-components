// @ts-expect-error Vite worker imports do not expose constructor types.
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// @ts-expect-error Vite worker imports do not expose constructor types.
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// @ts-expect-error Vite worker imports do not expose constructor types.
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
// @ts-expect-error Vite worker imports do not expose constructor types.
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
// @ts-expect-error Vite worker imports do not expose constructor types.
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

interface MonacoWorkerEnvironment {
  getWorker(_moduleId: string, label: string): Worker;
}

(self as typeof self & { MonacoEnvironment: MonacoWorkerEnvironment }).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};
