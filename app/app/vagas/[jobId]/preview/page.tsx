import JobsWorkspace from '@/app/components/jobs/JobsWorkspace';
export const metadata={title:'JobForged | Prévia da vaga'};
export default async function Page({params}:{params:Promise<{jobId:string}>}){const {jobId}=await params;return <JobsWorkspace view="preview" jobId={jobId}/>}
