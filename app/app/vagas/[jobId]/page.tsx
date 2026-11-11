import JobsWorkspace from '@/app/components/jobs/JobsWorkspace';
export const metadata={title:'JobForged | Vaga'};
export default async function Page({params}:{params:Promise<{jobId:string}>}){const {jobId}=await params;return <JobsWorkspace view="detail" jobId={jobId}/>}
