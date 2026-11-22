export type JobStatus = "Rascunho" | "Publicada" | "Pausada" | "Encerrada" | "Arquivada";
export type ProcessStage = { id: string; name: string; required: boolean };
export type Language = { language: string; level: string };
export type Job = {
  schemaVersion?:number; remoteScope?:string; noPrerequisites?:boolean; positions?:number; example?:boolean; colorToken?:number; resumeRequired?:boolean; acceptApplications?:boolean; hasUnpublishedChanges?:boolean; portalReady?:boolean; publishedVersion?:number;
  pcd:string;salaryRange:string;journey:string;description:string;attributions:string;contactEmail:string;contactPhone:string;contactWhatsapp:string;
  branchIds: string[];
  version?: number; id: string; organizationId: string; createdAt: string; updatedAt: string; status: JobStatus;
  title: string; area: string; level: string; contractType: string; modality: string; country: string; state: string; city: string;
  summary: string; responsibilities: string[]; requirements: string[]; experience: string; weeklyHours: string; schedule: string;
  salaryMin: string; salaryMax: string; currency: string; salaryConfidential: boolean;
  softSkills: string[]; differentiators: string[]; certifications: string[]; education: string; languages: Language[];
  benefits: string[]; additionalBenefits: string; careerPlan: string; performanceReviews: boolean; promotionPossible: boolean;
  teamDescription: string; reportsTo: string; teamSize: string; tools: string[]; methodology: string; challenges: string;
  openingReason: string; autonomy: string; hierarchy: string;
  stages: ProcessStage[]; technicalTest: boolean; interviewTypes: string[]; applicationDeadline: string; responseSla: string; lgpd: boolean;
  responsibleId: string; currentStep: number; applicationsCount: number;
};
export type Candidate = { id:string; organizationId:string; jobId:string; createdAt:string; updatedAt:string; status:string; name:string; email:string; skills:string[]; stage:string; score:number; location:string; resume:string; notes:string; history:string[] };
export type AutomationRule = { id:string; name:string; trigger:string; condition:string; action:string; active:boolean };
export type JobSettings = { aiScreening:boolean; advanceScore:number; rejectScore:number; highFitNotification:boolean; visibility:"Pública"|"Restrita"; acceptApplications:boolean; resumeRequired:boolean; coverLetter:boolean; anonymous:boolean; applicationLimit:number; positions:number; autoClose:boolean; notifications:string[]; slug:string; metaDescription:string; shareTitle:string; questions:{id:string;label:string;type:string;required:boolean}[]; rules:AutomationRule[] };

export const emptyJob = (organizationId=""):Job => ({
  schemaVersion:2,remoteScope:'',noPrerequisites:false,positions:1,example:false,colorToken:0,resumeRequired:true,acceptApplications:true,
  pcd:"",salaryRange:"",journey:"",description:"",attributions:"",contactEmail:"",contactPhone:"",contactWhatsapp:"",branchIds:[],id:"",organizationId,createdAt:"",updatedAt:"",status:"Rascunho",title:"",area:"",level:"",contractType:"",modality:"",country:"Brasil",state:"",city:"",
  summary:"",responsibilities:[],requirements:[],experience:"",weeklyHours:"",schedule:"",salaryMin:"",salaryMax:"",currency:"BRL",salaryConfidential:false,
  softSkills:[],differentiators:[],certifications:[],education:"",languages:[],benefits:[],additionalBenefits:"",careerPlan:"",performanceReviews:false,promotionPossible:false,
  teamDescription:"",reportsTo:"",teamSize:"",tools:[],methodology:"",challenges:"",openingReason:"",autonomy:"",hierarchy:"",stages:[],technicalTest:false,interviewTypes:[],applicationDeadline:"",responseSla:"",lgpd:false,responsibleId:"",currentStep:0,applicationsCount:0
});
