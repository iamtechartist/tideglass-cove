import {THREE,geom,mesh,tube,rod,height,shore,rand,mineralMaterial,standard,bakeMerge,U,foundationY,causticPatternNode} from './core.js';
import {isoSurface,smin,roundedBox} from './sculpt.js';
import {color,positionWorld,positionLocal,normalWorld,mix,smoothstep,sin,mx_noise_float,vec3,float,max,abs,pow} from 'three/tsl';

// The rear perimeter is eroded; two broad front sections are deliberate sea cuts.
const shape=new THREE.Shape();shape.moveTo(-5.9,2.1);shape.quadraticCurveTo(-6.45,-.1,-5.7,-2.6);shape.bezierCurveTo(-5.05,-4.75,-1.55,-4.65,.6,-4.46);shape.bezierCurveTo(3.8,-4.36,5.3,-3.36,5.65,-1.6);shape.quadraticCurveTo(6.06,-.2,5.88,1.3);shape.lineTo(3.75,5.05);shape.lineTo(-4.0,5.2);shape.quadraticCurveTo(-5.2,5.0,-5.9,2.1);
export const boundary=shape.getPoints(30).map(p=>new THREE.Vector2(p.x,p.y));
if(boundary[0].distanceTo(boundary.at(-1))<.001)boundary.pop();
// Subdivide long, clean edges too, so the top and side share precisely the same wave vertices.
export const edge=[];for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];const steps=Math.max(1,Math.ceil(a.distanceTo(b)/.10));for(let j=0;j<steps;j++)edge.push(a.clone().lerp(b,j/steps));}
export function inside(x,z){return shape.containsPoint?shape.containsPoint(new THREE.Vector2(x,z)):(()=>{let hit=false;for(let i=0,j=edge.length-1;i<edge.length;j=i++){const a=edge[i],b=edge[j];if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;})();}
export function surfaceGeometry(yFunction,rows=68){const p=[],ix=[],uv=[],n=edge.length;for(let r=0;r<=rows;r++){const s=Math.max(.0001,r/rows);for(let j=0;j<n;j++){const x=edge[j].x*s,z=edge[j].y*s;p.push(x,yFunction(x,z),z);uv.push(x/12+.5,z/10+.5);if(r<rows){const a=r*n+j,b=r*n+(j+1)%n,c=(r+1)*n+j,d=(r+1)*n+(j+1)%n;ix.push(a,b,c,b,d,c);}}}return geom(p,ix,uv)}
export const terrainMat=mineralMaterial('#ecddba','sand');
export const limestone=mineralMaterial('#bec3b8');
export const reefMat=mineralMaterial('#737e72');

const contactRocks=[];
function rockPlan(seed){return Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2,r=.88+.10*Math.sin(i*2.7+seed)+.055*Math.sin(i*4.4-seed);return new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r)})}
function rockSection(p,scale,seed,q){const a=Math.atan2(p.y,p.x),base=.94+.06*Math.sin(a*3+seed),top=.50+.22*Math.sin(a*1.8+seed)*Math.sin(seed+.4),r=q<.34?base+(1.02-base)*q/.34:q<.64?1.02+(.90-1.02)*(q-.34)/.30:.90+(top-.90)*(q-.64)/.36;return [p.x*scale[0]*r,-p.y*scale[2]*r];}
function erodedStone(scale,seed=rand()*10){
 const polygon=rockPlan(seed),levels=[0,.34,.64,1],p=[],ix=[];
 for(let r=0;r<levels.length;r++)for(let j=0;j<polygon.length;j++){const q=levels[r],v=polygon[j],[x,z]=rockSection(v,scale,seed,q),a=j/9*Math.PI*2,y=scale[1]*(-.48+1.32*q)+q*(.12*x-.13*z+.105*scale[1]*Math.sin(a*2+seed));p.push(x,y,z);if(r<levels.length-1){const n=r*9+j,b=r*9+(j+1)%9;ix.push(n,b,n+9,b,b+9,n+9);}}
 const low=p.length/3;p.push(0,-.48*scale[1],0,0,.74*scale[1],0);for(let j=0;j<9;j++){ix.push(low,(j+1)%9,j);ix.push(low+1,27+j,27+(j+1)%9);}
 const g=geom(p,ix).toNonIndexed();g.computeVertexNormals();g.userData={seed,polygon,scale};return g;
}
export function stone(parent,x,z,s=[.3,.25,.25],y=height(x,z)+s[1]*.36,mat=limestone){
 const seed=rand()*10,rotation=rand()*6.28,g=erodedStone(s,seed),m=mesh(g,mat,parent,[x,y,z],[0,rotation,0]);m.userData.pickRole='rock';
 contactRocks.push({x,z,y,rotation,scale:s,seed,polygon:rockPlan(seed)});return m;
}
export function wetSurfaceGeometry(maxWater=.48,rows=78){
 const source=surfaceGeometry(height,rows),p=source.attributes.position,idx=source.index,positions=[];
 // Clip every triangle to the reachable tidal envelope. Dry interior has no sea mesh.
 for(let i=0;i<idx.count;i+=3){let poly=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+j))),out=[];
  for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],aa=a.y<=maxWater,bb=b.y<=maxWater;if(aa)out.push(a);if(aa!==bb){let lo=0,hi=1;for(let k=0;k<18;k++){const t=(lo+hi)*.5,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if((height(x,z)<=maxWater)===aa)lo=t;else hi=t;}out.push(a.clone().lerp(b,(lo+hi)*.5));}}
  for(let j=1;j<out.length-1;j++)for(const v of [out[0],out[j],out[j+1]])positions.push(v.x,0,v.z);
 }
 source.dispose();return geom(positions);
}
export function wallPoint(e,q){
 const h=height(e.x,e.y),dry=smoothCPU(.22,.64,h),inset=(.012*q*q+.005*Math.sin(e.x*3.4+e.y*2.8)*Math.sin(q*Math.PI))*dry;
 return [e.x*(1-inset),h+(foundationY(e.x,e.y)-h)*q,e.y*(1-inset)];
}
function smoothCPU(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
export function buildTerrain(scene){
 const land=mesh(surfaceGeometry(height),terrainMat,scene);land.name='Continuous beach and seabed';land.userData.pickRole='land';
 const p=[],ix=[],n=edge.length,rows=12;for(let j=0;j<=rows;j++)for(let i=0;i<n;i++){p.push(...wallPoint(edge[i],j/rows));if(j<rows){const a=j*n+i,b=j*n+(i+1)%n,c=(j+1)*n+i,d=(j+1)*n+(i+1)%n;ix.push(a,b,c,b,d,c)}}
 const base=mesh(geom(p,ix),mineralMaterial('#aab0a4','strata'),scene);base.name='Joined limestone and sediment section';base.userData.pickRole='land';
 const bp=[],bi=[];const bottomRows=24;for(let r=0;r<=bottomRows;r++)for(let i=0;i<n;i++){const e=edge[i],q=r/bottomRows,outer=wallPoint(e,1);const x=outer[0]*Math.max(.00001,q),z=outer[2]*Math.max(.00001,q);bp.push(x,r===bottomRows?outer[1]:foundationY(x,z),z);if(r<bottomRows){const a=r*n+i,b=r*n+(i+1)%n,c=(r+1)*n+i,d=(r+1)*n+(i+1)%n;bi.push(a,c,b,b,c,d)}}
 const bottom=mesh(geom(bp,bi),mineralMaterial('#969e93','underside'),scene);bottom.name='Continuous rising underside';
 // Fragments sit predominantly inside the section; only their broken tips emerge.
 const chips=[];for(let i=0;i<46;i++){const e=edge[Math.floor(rand()*edge.length)];if(e.y>1.2)continue;const q=.28+rand()*.64,wp=wallPoint(e,q),sy=.035+rand()*.055,g=erodedStone([sy*1.9,sy*.60,sy],i,5);g.translate(wp[0]*.991,wp[1],wp[2]*.991);chips.push(g);}bakeMerge(chips,limestone,scene);
 // Sparse contact stones and a submerged shelf guide the eye toward the grotto.
 [[-5.05,.6,.65,.35,.55],[-4.7,1.18,.43,.25,.32],[-5.28,-.2,.42,.35,.53],[4.7,1.38,.68,.47,.46],[4.85,2.06,.32,.29,.35],[3.27,2.9,.53,.25,.32],[2.63,2.8,.27,.16,.22],[-2.1,3.25,.32,.13,.21],[-1.78,3.4,.17,.1,.14],[.7,1.85,.28,.17,.26],[3.74,-2.33,.5,.36,.42]].forEach(([x,z,a,b,c])=>stone(scene,x,z,[a,b,c]));
 const reefs=[];for(const [x,z,s] of [[4.2,2.05,.75],[3.75,2.55,.42],[-3.8,2.1,.45],[-4.1,2.4,.35],[1.8,4.40,.38]]){for(let j=0;j<5;j++){const xx=x+(rand()-.5)*s,zz=z+(rand()-.5)*s;const g=erodedStone([s*(.3+rand()*.4),s*.3,s*(.3+rand()*.4)],rand()*10,10);g.translate(xx,height(xx,zz)+.13,zz);reefs.push(g)}}bakeMerge(reefs,reefMat,scene);
 // Shells above the wash: asymmetrical fans, sparse and never uniformly scattered.
 const shellMats=[standard('#f1e6d2'),standard('#c9aa8c'),standard('#e6c9b0')];for(let i=0;i<23;i++){const x=-4.6+rand()*8.4,z=shore(x)-.55-rand()*.35;if(!inside(x,z))continue;const sp=[],si=[];const r=.018+rand()*.032;sp.push(0,.008,0);for(let j=0;j<=12;j++){const a=Math.PI*j/12;sp.push(Math.cos(a)*r,Math.sin(a)*r*.25,Math.sin(a)*r*(1+.08*Math.sin(j*Math.PI)));if(j<12)si.push(0,j+1,j+2)}mesh(geom(sp,si),shellMats[i%3],scene,[x,height(x,z)+.009,z],[0,rand()*6,0]);}
 // Low-contrast impressions conform to the topography.
 const imprint=standard('#a99c7b',1);imprint.transparent=true;imprint.opacity=.20;imprint.depthWrite=false;
 const impressions=[];for(let i=0;i<12;i++){const x=-1.36+i*.08+(i%2)*.1,z=-1.4+i*.1,g=new THREE.CircleGeometry(.052,12);g.scale(.52,1.25,1);g.rotateZ(-.24);g.rotateX(-Math.PI/2);g.translate(x,height(x,z)+.011,z);impressions.push(g.toNonIndexed());}
 for(const x of [-3.7,-2.32])for(let i=0;i<22;i++){const z=-3.15+i*.052,g=new THREE.PlaneGeometry(.075,.017);g.rotateZ(-.1);g.rotateX(-Math.PI/2);g.translate(x,height(x,z)+.013,z);impressions.push(g.toNonIndexed());}
 const marks=bakeMerge(impressions,imprint,scene);marks.castShadow=false;marks.receiveShadow=false;marks.userData.noPick=true;
 return {land,base};
}
export function archField(x,y,z){
 x+=.055*Math.sin(y*3.8+z*1.1);z+=.085*Math.sin(x*3.3+y*1.3);
 // Interlocking limestone blocks with different bedding planes and eroded lower shoulders.
 const left=Math.max(-x-1.78+.12*y+.08*z+.10*Math.sin(z*1.7+y),x+.58-.22*y+.05*z,z-.52+.11*y-.09*Math.sin(y*2.2+x),-z-1.67+.06*y,y-(2.17-.16*(x+.82)**2-.07*(z+.65)**2),-y-1.32);
 const right=Math.max(-x+.70-.13*y+.10*Math.exp(-((y+.06)**2)/.16),x-1.35+.08*y+.08*z+.065*Math.sin(y*2.8-z),z-.48+.18*y-.075*Math.sin(y*2.4+x*1.6),-z-1.62+.03*y,y-1.93+.06*x-.13*z,-y-1.29);
 const roofTop=2.06+.16*Math.exp(-((x+.78)**2)/.8)-.18*x+.10*Math.cos(z*2+x*1.7)-.07*(z+.35)**2;
 const roofBottom=1.53+.14*x-.10*Math.cos(x*2.4)+.04*Math.sin(z*2.7+x);
 const roof=Math.max(x-1.33,-x-1.55,y-roofTop,roofBottom-y,z-(.48-.10*x+.10*Math.sin(x*2.2)-.05*Math.sin(x*5)),-z-1.48);
 const rear=Math.max(Math.abs(x-.10)-1.04,y-1.49-.12*x,-y-1.13,Math.abs(z+1.55)-.18);
 let rock=smin(smin(left,right,.08),roof,.12);rock=smin(rock,rear,.09);
 const width=.67+.10*smoothCPU(-1.45,.30,z)+.18*Math.sin((y+.12)*1.8)+.035*Math.sin(z*2.5),center=.10+.09*Math.sin(z*1.4)+.06*y;
 const top=1.58-.39*Math.pow(Math.abs((x-center)/width),2.5)+.042*Math.sin(x*6+z*3);
 const cavity=Math.max(Math.abs(x-center)-width,y-top,-y-1.29,-z-1.43,z-1.1);
 rock=Math.max(rock,-cavity);
 // Diagonal fracture planes truncate corners, while a waterline undercut narrows the feet.
 rock=Math.max(rock,.57*x+.36*y+.40*z-1.57,-.62*x+.27*y+.19*z-1.53,y-2.32-.11*Math.sin(x*1.9),.42*x+.60*y+.33*z-1.68);
 const undercut=.10*Math.exp(-((y+.02)**2)/.12)*(.5+.5*Math.sin(x*3.6+z*2));
 const bedding=.032*Math.exp(-((y-.43+.025*x)**2)/.002)+.027*Math.exp(-((y-1.34+.055*Math.sin(x*2))**2)/.004)+.018*Math.exp(-((y-.94-.026*z)**2)/.001);
 const nook=(Math.hypot((x+1.20)/.23,(y-.18)/.19,(z-.30)/.33)-1)*.19;rock=Math.max(rock,-nook);const roofFlake=(Math.hypot((x-.82)/.30,(y-1.89)/.16,(z-.21)/.33)-1)*.16;rock=Math.max(rock,-roofFlake);
 return rock+undercut+bedding+.017*Math.sin(x*13+y*3)*Math.sin(z*11-y*4)+.007*Math.sin(x*33+z*11)*Math.sin(y*31+z*7);
}
export function buildGrotto(scene){
 const group=new THREE.Group();scene.add(group);group.position.set(3.60,0,-.42);group.rotation.y=.18;group.userData.pickRole='rock';
 const mat=mineralMaterial('#c0c4b9'),p=positionWorld,local=positionLocal;
 const inner=float(1).sub(smoothstep(.66,1.12,abs(local.x.sub(.1)))).mul(float(1).sub(smoothstep(.25,.70,local.z))).mul(smoothstep(-.35,.30,local.y)).mul(float(1).sub(smoothstep(1.4,1.95,local.y)));
 const reflected=causticPatternNode(vec3(p.x,p.y.mul(.48),p.z.add(p.y.mul(.4))));
 mat.colorNode=mat.colorNode.mul(mix(vec3(1),vec3(.73,.87,.91),inner.mul(.55)));
 mat.emissiveNode=reflected.mul(inner).mul(vec3(.025,.075,.069)).mul(U.night.mul(.55).add(.48));mat.userData.keepLocal=true;
 const boundedRock=(x,y,z)=>{const wx=3.60+x*Math.cos(.18)+z*Math.sin(.18),wz=-.42-x*Math.sin(.18)+z*Math.cos(.18);return Math.max(archField(x,y,z),foundationY(wx,wz)+.045-y);};
 const arch=mesh(isoSurface(boundedRock,[-2.12,-1.35,-1.94],[1.79,2.45,1.03],.066),mat,group);arch.name='Carved limestone shoulder, roof and tidal recess';
 const light=new THREE.PointLight('#8ebfc0',.05,2.8,2);light.position.set(.05,.40,.06);group.add(light);
 group.updateMatrixWorld(true);return {group,light,arch};
}

const mapWidth=160,mapHeight=128,contactPixels=new Uint8Array(mapWidth*mapHeight*4);contactPixels.fill(255);
export const contactTexture=new THREE.DataTexture(contactPixels,mapWidth,mapHeight,THREE.RGBAFormat);contactTexture.minFilter=contactTexture.magFilter=THREE.LinearFilter;contactTexture.generateMipmaps=false;contactTexture.needsUpdate=true;
let lastContactTide=100;
export function updateRockContacts(tide,force=false){
 if(!force&&Math.abs(tide-lastContactTide)<.007)return;lastContactTide=tide;
 for(let j=0;j<mapHeight;j++)for(let i=0;i<mapWidth;i++){
  const x=-6.5+i/(mapWidth-1)*13,z=-4.9+j/(mapHeight-1)*10.5;let distance=.6;
  for(const r of contactRocks){const vertical=Math.max(r.y-r.scale[1]*.49-tide,tide-(r.y+r.scale[1]*1.02));if(vertical>.6)continue;const dx=x-r.x,dz=z-r.z,c=Math.cos(r.rotation),s=Math.sin(r.rotation),xx=dx*c-dz*s,zz=dx*s+dz*c;let edgeDistance=-100;
   for(let k=0;k<r.polygon.length;k++){const a=r.polygon[k],b=r.polygon[(k+1)%r.polygon.length],q=Math.max(0,Math.min(1,((tide-r.y)/r.scale[1]+.48)/1.32)),[ax,az]=rockSection(a,r.scale,r.seed,q),[bx,bz]=rockSection(b,r.scale,r.seed,q),ex=bx-ax,ez=bz-az;edgeDistance=Math.max(edgeDistance,((xx-ax)*(-ez)+(zz-az)*ex)/Math.hypot(ex,ez));}
   distance=Math.min(distance,Math.max(edgeDistance-.025,vertical));
  }
  const dx=x-3.60,dz=z+.42,c=Math.cos(.18),s=Math.sin(.18);distance=Math.min(distance,archField(dx*c-dz*s,tide,dx*s+dz*c));const v=Math.round((Math.max(-.6,Math.min(.6,distance))/.6*.5+.5)*255),k=(j*mapWidth+i)*4;contactPixels[k]=contactPixels[k+1]=contactPixels[k+2]=v;contactPixels[k+3]=255;
 }
 contactTexture.needsUpdate=true;
}
