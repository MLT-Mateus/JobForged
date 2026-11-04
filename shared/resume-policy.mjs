export const resumeLimit=5*1024*1024;
// Defense in depth, not an antivirus. PDFs are served as private attachments.
export function validResume(bytes){
 if(!bytes?.length||bytes.length>resumeLimit)return false;
 const text=Buffer.from(bytes).toString('latin1');
 return /^%PDF-1\.[0-7]/.test(text)&&text.slice(-2048).includes('%%EOF')&&!/\/(?:JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile|RichMedia|Encrypt)\b/i.test(text);
}
