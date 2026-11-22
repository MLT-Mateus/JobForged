import {imageMime} from '@/shared/image-upload';
/** Bounded binary transport avoids multipart being interpreted as a Server Action. */
export async function readImageUpload(request:Request,limit:number){
 const reader=request.body?.getReader();if(!reader)throw Error('Selecione uma imagem.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>limit+65536){await reader.cancel();throw Error('Image size limit')}chunks.push(chunk.value)}
 const bytes=Buffer.concat(chunks),contentType=request.headers.get('content-type')||'';
 let input:Uint8Array,name:string,mime:string,kind:string,companyId:string;
 if(contentType.startsWith('multipart/form-data')){
  const form=await new Request(request.url,{method:'POST',headers:request.headers,body:bytes}).formData(),file=form.get('file');
  if(!(file instanceof File))throw Error('Selecione uma imagem.');input=new Uint8Array(await file.arrayBuffer());name=file.name;mime=file.type;kind=String(form.get('kind')||'image');companyId=String(form.get('companyId')||'');
 }else{input=bytes;name=decodeURIComponent(request.headers.get('x-upload-name')||'');mime=contentType;kind=request.headers.get('x-image-kind')||'image';companyId=request.headers.get('x-company-id')||''}
 if(!input.byteLength||input.byteLength>limit)throw Error('Image size limit');
 const type=imageMime(name,mime);if(!type)throw Error('Unsupported image format');
 return {input,name,mime:type,kind,companyId};
}
