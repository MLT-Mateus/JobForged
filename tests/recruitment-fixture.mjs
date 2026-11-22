import {emptyJob} from '../app/components/jobs/job-types.ts';
const {id,organizationId,createdAt,updatedAt,status,applicationsCount,colorToken,...document}=emptyJob();
void [id,organizationId,createdAt,updatedAt,status,applicationsCount,colorToken];
process.stdout.write(`select set_config('jbfd.empty_job',$fixture$${JSON.stringify(document)}$fixture$,true);\n`);
