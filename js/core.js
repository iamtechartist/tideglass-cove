import * as THREE from 'three';
import {uniform,vec2,vec3,vec4,float,Fn,sin,cos,abs,max,min,mix,smoothstep,exp,pow,normalize,positionLocal,positionWorld,normalWorld,mx_noise_float,color,attribute,bumpMap,texture} from 'three/tsl';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export {THREE,mergeGeometries};
export const U={time:uniform(0),tide:uniform(0),night:uniform(0),breeze:uniform(.35),wet:uniform(.12),sun:uniform(new THREE.Vector3(-.5,.8,.25).normalize()),debugWater:uniform(0),ripples:Array.from({length:8},()=>uniform(new THREE.Vector4(0,0,-100,0)))};
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export function rng(seed=8263){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const rand=rng();
export const shore=x=>-.55+.062*x*x+.17*Math.sin(x*.85)+.06*Math.sin(x*2.2);
export const shoreNode=Fn(([x])=>float(-.55).add(x.mul(x).mul(.062)).add(sin(x.mul(.85)).mul(.17)).add(sin(x.mul(2.2)).mul(.06)));
export function grottoBasin(x,z){return 1-smooth(.96,1.28,Math.hypot((x-3.50)/1.10,(z+.85)/1.70))}
export const basinNode=Fn(([x,z])=>float(1).sub(smoothstep(.96,1.28,vec2(x.sub(3.50).div(1.10),z.add(.85).div(1.70)).length())));
export function height(x,z){
 const d=z-shore(x);
 let h=-.91*Math.tanh(d*.53)-.93*smooth(.8,4.9,d)+.20*Math.exp(-((x+1.1)**2/7+(z+3.6)**2/1.8))-.30*Math.exp(-((x-3.4)**2/2.8+(z-.4)**2/3));
 h+=.011*Math.sin(z*18+1.2*Math.sin(x*1.7))*smooth(.35,1.8,d)+.011*Math.sin(x*3+z*2)*smooth(.35,1.3,-d);
 const pad=(1-smooth(1.65,2.30,Math.abs(x+2.48)))*(1-smooth(1.00,2.15,Math.abs(z+2.48)));
 h+=(.87-h)*pad;
 return h+(Math.max(-.86+.04*Math.sin(x*4),foundationY(x,z)+.22)-h)*grottoBasin(x,z);
}
export const heightNode=Fn(([x,z])=>{
 const d=z.sub(shoreNode(x));
 let h=float(.91).mul(float(1).sub(float(2).div(float(1).add(exp(d.mul(-1.06)))))).sub(smoothstep(.8,4.9,d).mul(.93)).add(exp(x.add(1.1).pow(2).div(7).add(z.add(3.6).pow(2).div(1.8)).negate()).mul(.20)).sub(exp(x.sub(3.4).pow(2).div(2.8).add(z.sub(.4).pow(2).div(3)).negate()).mul(.30));
 h=h.add(sin(z.mul(18).add(sin(x.mul(1.7)).mul(1.2))).mul(.011).mul(smoothstep(.35,1.8,d))).add(sin(x.mul(3).add(z.mul(2))).mul(.011).mul(smoothstep(.35,1.3,d.negate())));
 const pad=float(1).sub(smoothstep(1.65,2.30,abs(x.add(2.48)))).mul(float(1).sub(smoothstep(1.00,2.15,abs(z.add(2.48)))));
 h=mix(h,.87,pad);return mix(h,max(sin(x.mul(4)).mul(.04).sub(.86),float(-1.92).add(float(1).sub(smoothstep(-3,1,z)).mul(1.33))),basinNode(x,z));
});
export const foundationY=(x,z)=>-2.14+1.33*(1-smooth(-3.0,1.0,z));

// One set of coefficients serves the CPU contact solver and the TSL surface.
export const WAVE_COMPONENTS=[
 {x:.24,z:1.65,speed:1.02,amplitude:.041,wind:false},
 {x:-.46,z:3.05,speed:1.37,amplitude:.020,wind:false},
 {x:7.1,z:5.3,speed:-2.25,amplitude:.0048,wind:true}
];
export function shelter(x,z){const d=z-shore(x),lee=Math.exp(-((x-4.05)**2/1.1+(z-.05)**2/1.8));return (.34+.66*smooth(.1,4.2,d))*(1-.62*lee)*(1-.40*grottoBasin(x,z))}
export const shelterNode=Fn(([x,z])=>mix(.34,1,smoothstep(.1,4.2,z.sub(shoreNode(x)))).mul(float(1).sub(exp(x.sub(4.05).pow(2).div(1.1).add(z.sub(.05).pow(2).div(1.8)).negate()).mul(.62))).mul(float(1).sub(basinNode(x,z).mul(.40))));
export function wave(x,z,t=U.time.value){
 let w=0;for(const c of WAVE_COMPONENTS)w+=Math.sin(x*c.x+z*c.z+t*c.speed)*c.amplitude*(c.wind?U.breeze.value+.25:1);
 w*=shelter(x,z);w+=Math.sin(t*1.02+x*.24+z*1.65)*.021*grottoBasin(x,z);
 for(const r of U.ripples){const v=r.value,age=t-v.z;if(v.w===0||age<=0)continue;const d=Math.hypot(x-v.x,z-v.y),q=d-age*1.25,env=Math.exp(-q*q*4.8-age*.72)*smooth(0,.16,age)/(1+d*.45);w+=Math.sin(d*11-age*13.75)*env*v.w*.023;}
 return w+U.tide.value;
}
export const waveNode=Fn(([x,z])=>{
 let w=float(0);for(const c of WAVE_COMPONENTS)w=w.add(sin(x.mul(c.x).add(z.mul(c.z)).add(U.time.mul(c.speed))).mul(c.amplitude).mul(c.wind?U.breeze.add(.25):1));
 w=w.mul(shelterNode(x,z)).add(sin(U.time.mul(1.02).add(x.mul(.24)).add(z.mul(1.65))).mul(.021).mul(basinNode(x,z)));
 for(const r of U.ripples){const d=vec2(x,z).sub(r.xy).length(),age=U.time.sub(r.z),q=d.sub(age.mul(1.25));const env=exp(q.pow(2).mul(-4.8).sub(max(age,0).mul(.72))).mul(smoothstep(0,.16,age)).div(d.mul(.45).add(1));w=w.add(sin(d.mul(11).sub(age.mul(13.75))).mul(env).mul(r.w).mul(.023));}
 return w.add(U.tide);
});
export const waveGradientNode=Fn(([x,z])=>{
 let g=vec2(0);for(const c of WAVE_COMPONENTS)g=g.add(vec2(c.x,c.z).mul(cos(x.mul(c.x).add(z.mul(c.z)).add(U.time.mul(c.speed)))).mul(c.amplitude).mul(c.wind?U.breeze.add(.25):1));
 g=g.mul(shelterNode(x,z));
 for(const r of U.ripples){const delta=vec2(x,z).sub(r.xy),d=max(delta.length(),.01),age=U.time.sub(r.z),q=d.sub(age.mul(1.25)),phase=d.mul(11).sub(age.mul(13.75));const env=exp(q.pow(2).mul(-4.8).sub(max(age,0).mul(.72))).mul(smoothstep(0,.16,age)).div(d.mul(.45).add(1));const derivative=cos(phase).mul(11).sub(sin(phase).mul(q.mul(9.6).add(float(.45).div(d.mul(.45).add(1)))));g=g.add(delta.div(d).mul(derivative).mul(env).mul(r.w).mul(.023));}
 return g;
});

// Local wash history: each texel records contact and then dries independently.
const wetSize=112,wetHistory=new Float32Array(wetSize*wetSize),wetPixels=new Uint8Array(wetSize*wetSize*4);
const wetTexture=new THREE.DataTexture(wetPixels,wetSize,wetSize,THREE.RGBAFormat);wetTexture.minFilter=wetTexture.magFilter=THREE.LinearFilter;wetTexture.generateMipmaps=false;wetTexture.needsUpdate=true;
const wetNode=texture(wetTexture);let wetTime=-1,wetInitialized=false;
export function updateWetness(t,dt,force=false){
 if(!force&&t-wetTime<.10&&Math.abs(U.tide.value-U.wet.value)<.003)return;
 const elapsed=wetTime<0?.1:Math.max(.001,t-wetTime),decay=Math.exp(-elapsed/11);
 for(let j=0;j<wetSize;j++)for(let i=0;i<wetSize;i++){
  const x=-6.5+i/(wetSize-1)*13,z=-4.9+j/(wetSize-1)*10.5,k=j*wetSize+i,h=height(x,z),surface=wave(x,z,t);
  let current=1-smooth(surface-.025,surface+.035,h);
  if(!wetInitialized)current=Math.max(current,(1-smooth(wave(x,z,t-1.2)-.025,wave(x,z,t-1.2)+.05,h))*.8);
  wetHistory[k]=Math.max(current,wetHistory[k]*decay);const v=Math.round(wetHistory[k]*255);wetPixels[k*4]=wetPixels[k*4+1]=wetPixels[k*4+2]=v;wetPixels[k*4+3]=255;
 }
 wetTime=t;wetInitialized=true;U.wet.value=U.tide.value;wetTexture.needsUpdate=true;
}
export const causticPatternNode=Fn(([p])=>{
 const t=U.time,depth=max(U.tide.sub(p.y),0),scale=float(2.65).div(depth.mul(.21).add(1));
 const q=p.xz.add(U.sun.xz.mul(p.y).div(max(U.sun.y,.25))).add(vec2(sin(t.mul(.31).add(p.z)).mul(.08),cos(t.mul(.24).add(p.x)).mul(.09)));
 const warp=mx_noise_float(vec3(q.mul(.73),t.mul(.10)));
 const a=mx_noise_float(vec3(q.mul(scale).add(warp.mul(.6)),t.mul(.12))),b=mx_noise_float(vec3(q.mul(scale.mul(1.13)).add(7),t.mul(-.09)));
 const focus=smoothstep(-.12,.38,mx_noise_float(vec3(q.mul(.67).add(21),t.mul(.065))));
 const width=warp.mul(.035).add(.058);
 const fine=pow(float(1).sub(smoothstep(0,width,abs(a.add(b.mul(.56))))),2.2);
 const patch=exp(a.sub(.12).pow(2).mul(-35)).mul(exp(b.add(.16).pow(2).mul(-26))).mul(.16);
 return fine.mul(focus.pow(1.7)).add(patch);
});
export const causticNode=Fn(([p])=>{
 const d=U.tide.sub(p.y),facing=max(dotSafe(normalWorld,U.sun),0),sheltered=float(1).sub(basinNode(p.x,p.z).mul(.78));
 return causticPatternNode(p).mul(smoothstep(.025,.20,d)).mul(exp(max(d,0).mul(-.48))).mul(facing.mul(.8).add(.12)).mul(sheltered).mul(float(1).sub(U.night.mul(.91)));
});
function dotSafe(a,b){return a.x.mul(b.x).add(a.y.mul(b.y)).add(a.z.mul(b.z));}
export function standard(c,rough=.7,metal=0){return new THREE.MeshStandardNodeMaterial({color:c,roughness:rough,metalness:metal})}
export function mineralMaterial(base,kind='rock'){
 const m=standard(base,kind==='sand'?.96:.88),p=positionWorld;
 const n=mx_noise_float(p.mul(kind==='sand'?3.8:3.2)),fine=mx_noise_float(p.mul(kind==='sand'?155:43));
 const submerged=float(1).sub(smoothstep(U.tide.sub(.02),U.tide.add(.025),p.y));
 if(kind==='sand'){
  const wet=wetNode.sample(vec2(p.x.add(6.5).div(13),p.z.add(4.9).div(10.5)).clamp(0,1)).r;
  const ripple=sin(p.z.mul(29).add(sin(p.x.mul(1.6)).mul(3))).mul(.0015).mul(float(1).sub(wet));
  m.colorNode=mix(color('#e5d4b0'),color('#aa9671'),wet.mul(.72)).mul(n.mul(.032).add(fine.mul(.043)).add(1));
  m.colorNode=m.colorNode.mul(causticNode(p).mul(.85).add(1));
  m.roughnessNode=mix(mix(.98,.30,wet),.87,submerged);m.metalnessNode=float(0);
  m.normalNode=bumpMap(fine.mul(.0013).add(ripple),.36);
 }else if(kind==='strata'||kind==='underside'){
  const below=heightNode(p.x,p.z).sub(p.y),layer=sin(p.y.mul(28).add(n.mul(.23))).mul(.022);
  const limestone=mix(color('#969f98'),color('#c0c1b3'),smoothstep(-1.9,.2,p.y));
  const seam=pow(max(float(1).sub(abs(sin(p.y.mul(8.3).add(n.mul(.16)))).mul(24)),0),2).mul(.12);
  m.colorNode=mix(limestone,color('#c6b68f'),kind==='underside'?0:float(1).sub(smoothstep(.12,.38,below))).mul(n.mul(.065).add(fine.mul(.043)).add(layer).add(1).sub(seam));
  m.normalNode=bumpMap(n.mul(.008).add(fine.mul(.003)),.55);m.roughness=.96;
 }else{
  const wet=float(1).sub(smoothstep(U.tide.add(.01),U.tide.add(.40),p.y));
  const layer=sin(p.y.mul(24).add(n.mul(.30))).mul(.025),pores=pow(max(fine,0),3).mul(.12);
  m.colorNode=color(base).mul(n.mul(.065).add(layer).add(fine.mul(.08)).add(1).sub(pores)).mul(mix(vec3(1),vec3(.50,.60,.58),wet));
  m.colorNode=m.colorNode.mul(causticNode(p).mul(.62).add(1));m.roughnessNode=mix(.91,.48,wet);
  m.normalNode=bumpMap(n.mul(.011).add(fine.mul(.005)),.65);
 }
 m.emissiveNode=vec3(0);return m;
}
export function mesh(geo,mat,parent,pos,rot){const m=new THREE.Mesh(geo,mat);if(pos)m.position.set(...pos);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m}
export function geom(pos,idx,uvs,colors){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));if(idx)g.setIndex(idx);if(uvs)g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));if(colors)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g}
export function tube(points,radius,mat,parent,segments=32,sides=7){const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,segments,radius,sides,false),mat,parent)}
export function rod(a,b,r,mat,parent){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),8),mat,parent);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
export function bakeMerge(geos,mat,parent){if(!geos.length)return;const m=mesh(mergeGeometries(geos,false),mat,parent);geos.forEach(g=>g.dispose());return m}
