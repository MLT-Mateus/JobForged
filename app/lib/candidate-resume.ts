import {resumeLimit,validResume} from '../../shared/resume-policy.mjs';
export {resumeLimit};
export function validateResume(bytes:Uint8Array){if(!validResume(bytes))throw new Error('Use PDF simples de até 5 MB, sem senha, anexos ou ações automáticas.');return bytes}
