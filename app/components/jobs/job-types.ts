export type JobStatus = "Rascunho" | "Publicada" | "Pausada" | "Encerrada" | "Arquivada";
export type ProcessStage = { id: string; name: string; required: boolean };
export type Language = { language: string; level: string };
export type Job = {
  id: string; organizationId: string; createdAt: string; updatedAt: string; status: JobStatus;
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

export const emptyJob = (organizationId="org_jobforged_demo"):Job => ({
  id:"",organizationId,createdAt:"",updatedAt:"",status:"Rascunho",title:"",area:"",level:"",contractType:"",modality:"",country:"Brasil",state:"",city:"",
  summary:"",responsibilities:[],requirements:[],experience:"",weeklyHours:"",schedule:"",salaryMin:"",salaryMax:"",currency:"BRL",salaryConfidential:false,
  softSkills:[],differentiators:[],certifications:[],education:"",languages:[],benefits:[],additionalBenefits:"",careerPlan:"",performanceReviews:false,promotionPossible:false,
  teamDescription:"",reportsTo:"",teamSize:"",tools:[],methodology:"",challenges:"",openingReason:"",autonomy:"",hierarchy:"",stages:[{id:"triagem",name:"Triagem",required:true},{id:"entrevista",name:"Entrevista",required:true}],technicalTest:false,interviewTypes:[],applicationDeadline:"",responseSla:"",lgpd:false,responsibleId:"usr-mateus",currentStep:0,applicationsCount:0
});
