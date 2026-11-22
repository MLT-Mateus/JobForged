import test from 'node:test';
import assert from 'node:assert/strict';
import {readBannerDraft,bannerDraftLifetime} from '../shared/banner-draft.mjs';
const now=1800000000000;
const value={id:null,version:0,title:'Draft',description:'Internal label',image_id:'99000000-0000-4000-8000-000000000800',link:'',active:false,position:0,duration_seconds:8};
test('partial banner keeps uploaded image and fields without publishing or keeping unrelated data',()=>{
 const restored=readBannerDraft(JSON.stringify({savedAt:now,value:{...value,unrelated:'discard'}}),now);
 assert.deepEqual(restored,{...value,mobile_image_id:null});
});
test('expired, corrupted or invalid banner recovery is rejected',()=>{
 for(const raw of ['bad',JSON.stringify({savedAt:now-bannerDraftLifetime-1,value}),JSON.stringify({savedAt:now+1,value}),JSON.stringify({savedAt:now,value:{...value,image_id:'invalid'}}),JSON.stringify({savedAt:now,value:{...value,title:'x'.repeat(101)}})])assert.equal(readBannerDraft(raw,now),null);
});
