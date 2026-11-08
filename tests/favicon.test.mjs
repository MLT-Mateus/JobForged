import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';

test('search and touch icons are square, decodable raster images containing the brand',async()=>{
 for(const [path,size] of [['favicon-96x96.png',96],['apple-touch-icon.png',180]]){
  const bytes=await readFile(new URL('../public/'+path,import.meta.url)),image=sharp(bytes),metadata=await image.metadata(),stats=await image.stats();
  assert.equal(metadata.format,'png');assert.equal(metadata.width,size);assert.equal(metadata.height,size);
  assert.ok(stats.channels.slice(0,3).some(channel=>channel.max>channel.min),'Icon must contain visible artwork');
  assert.ok(stats.channels[3].max>0,'Icon must not be fully transparent');
 }
});
test('conventional favicon has valid 16, 32 and 48 px ICO frames',async()=>{
 const ico=await readFile(new URL('../public/favicon.ico',import.meta.url));
 assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
 for(const [index,size] of [16,32,48].entries()){
  const at=6+index*16,length=ico.readUInt32LE(at+8),offset=ico.readUInt32LE(at+12);
  assert.equal(ico[at],size);assert.equal(ico[at+1],size);assert.ok(offset>=54);assert.ok(offset+length<=ico.length);
  const frame=await sharp(ico.subarray(offset,offset+length)).metadata();assert.equal(frame.width,size);assert.equal(frame.height,size);
 }
});
