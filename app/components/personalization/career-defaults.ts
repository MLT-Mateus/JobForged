export const careerDefaults={
 cultureBanner:'/careers/culture-jobforged-v1.webp',
 image:'/careers/team-jobforged-v2.webp',
 banner:'/careers/team-jobforged-panorama-v1.webp',
 headline:'Seu próximo capítulo começa aqui.',
 introduction:'Boas ideias ganham vida quando pessoas diferentes constroem juntas. Encontre um lugar para aprender, contribuir e fazer a diferença.',
 about:'Acreditamos em relações de confiança, espaço para boas ideias e aprendizado todos os dias. Queremos construir uma experiência de trabalho em que cada pessoa possa contribuir com o que tem de melhor.'
};
const stockMasks=new Map([careerDefaults.image,careerDefaults.banner,careerDefaults.cultureBanner].map(photo=>{
 const name=photo.slice('/careers/'.length,-'.webp'.length);
 return [photo,{primary:`/careers/masks/${name}-primary.webp`,secondary:`/careers/masks/${name}-secondary.webp`}];
}));
const stockMaskPaths=new Set([...stockMasks.values()].flatMap(pair=>[pair.primary,pair.secondary]));
export const careerPhotoMasks=(stock:string)=>stockMasks.get(stock);
export const isCareerPhotoMask=(path:string)=>stockMaskPaths.has(path);
export const demoCareerJobs=[
 {title:'Product Designer',area:'Produto e design',location:'Remoto',level:'Pleno',description:'Transforme desafios de recrutamento em experiências simples, acessíveis e humanas.'},
 {title:'Pessoa Desenvolvedora Full Stack',area:'Tecnologia',location:'Remoto',level:'Pleno',description:'Construa ferramentas que aproximam empresas e talentos, em parceria com produto e design.'},
 {title:'Analista de Customer Success',area:'Experiência do cliente',location:'Híbrido',level:'Júnior',description:'Ajude empresas a criar processos de contratação mais organizados e acolhedores.'},
 {title:'Analista de Pessoas e Cultura',area:'Pessoas',location:'Remoto',level:'Pleno',description:'Cuide da jornada das pessoas e fortaleça uma cultura de colaboração e desenvolvimento.'}
];
