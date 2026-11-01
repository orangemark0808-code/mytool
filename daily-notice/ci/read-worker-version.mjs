import {readFileSync} from 'node:fs';

const rows = readFileSync(process.env.WRANGLER_OUTPUT_FILE_PATH, 'utf8')
  .split('\n').filter(Boolean).map(line => JSON.parse(line));
const upload = rows.findLast(row => row.type === 'version-upload');
if (upload?.worker_name !== 'daily-notice-api' ||
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(upload.version_id ?? '')) {
  throw new Error('公開対象のWorkerバージョンを確認できません。');
}
process.stdout.write(upload.version_id);
