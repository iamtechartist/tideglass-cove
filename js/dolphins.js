import {THREE,U,geom,mesh,standard,mergeGeometries,wave,clamp,smooth,tube} from './core.js';
import {mergeActorParts} from './optimize.js';
import {projectEnvironment} from './collision.js';
import {positionLocal,sin,float,vec3,mix,color,smoothstep,max,abs,uniform} from 'three/tsl';

// Monotone cubic radii keep the torso smooth through its sampled anatomical stations.
const profile=[[-.69,.003,.005,-.015],[-.64,.031,.025,-.015],[-.49,.040,.029,-.012],[-.43,.059,.068,.009],[-.35,.096,.111,.023],[-.18,.116,.126,.016],[.03,.105,.115,.002],[.23,.072,.086,-.005],[.43,.031,.046,-.008],[.59,.020,.024,-.002]];
function sample(z,c){let k=0;while(k<profile.length-2&&profile[k+1][0]<z)k++;const a=profile[k],b=profile[k+1],h=b[0]-a[0],s=(b[c]-a[c])/h;
 function tangent(i){if(i===0)return (profile[1][c]-profile[0][c])/(profile[1][0]-profile[0][0]);if(i===profile.length-1)return (profile[i][c]-profile[i-1][c])/(profile[i][0]-profile[i-1][0]);const h0=profile[i][0]-profile[i-1][0],h1=profile[i+1][0]-profile[i][0],d0=(profile[i][c]-profile[i-1][c])/h0,d1=(profile[i+1][c]-profile[i][c])/h1;if(d0*d1<=0)return 0;const w1=2*h1+h0,w2=h1+2*h0;return(w1+w2)/(w1/d0+w2/d1);}
 const t=clamp((z-a[0])/h),t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*a[c]+(t3-2*t2+t)*h*tangent(k)+(-2*t3+3*t2)*b[c]+(t3-t2)*h*tangent(k+1);
}
function dolphinGeometry(){
 const p=[],ix=[],rings=84,sides=32;for(let i=0;i<=rings;i++){const z=-.69+i/rings*1.28,rx=sample(z,1),ry=sample(z,2),cy=sample(z,3);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;p.push(Math.cos(a)*rx,Math.sin(a)*ry+cy,z);if(i<rings&&j<sides){const n=i*(sides+1)+j;ix.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}}}
 const all=[geom(p,ix)],dorsal=new THREE.Shape();dorsal.moveTo(-.14,.10);dorsal.bezierCurveTo(-.10,.15,-.095,.26,-.008,.285);dorsal.bezierCurveTo(-.036,.209,.075,.12,.18,.096);dorsal.closePath();
 const dg=new THREE.ExtrudeGeometry(dorsal,{depth:.014,bevelEnabled:true,bevelSize:.005,bevelThickness:.005,bevelSegments:3,steps:1,curveSegments:20});dg.rotateY(-Math.PI/2);dg.translate(.007,0,0);dg.deleteAttribute('uv');all.push(dg);
 for(const side of [-1,1]){const fp=[],fi=[],rows=18,cols=12;for(let i=0;i<=rows;i++){const t=i/rows,x=side*(.065+t*.215),z=-.235+t*.225,y=-.057-t*.08,w=.052*Math.sin(Math.PI*Math.pow(t,.63))+.0005,th=.012*Math.sin(Math.PI*Math.pow(t,.4));for(let j=0;j<=cols;j++){const a=j/cols*Math.PI*2;fp.push(x,y+Math.sin(a)*th,z+Math.cos(a)*w);if(i<rows&&j<cols){const n=i*(cols+1)+j;fi.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}}}all.push(geom(fp,fi));}
 const tailShape=new THREE.Shape();tailShape.moveTo(0,.51);tailShape.bezierCurveTo(-.12,.505,-.20,.56,-.25,.675);tailShape.bezierCurveTo(-.13,.643,-.058,.666,0,.62);tailShape.bezierCurveTo(.058,.666,.13,.643,.25,.675);tailShape.bezierCurveTo(.20,.56,.12,.505,0,.51);
 const tg=new THREE.ExtrudeGeometry(tailShape,{depth:.008,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:3,steps:1,curveSegments:24});tg.rotateX(Math.PI/2);tg.translate(0,.006,0);tg.deleteAttribute('uv');all.push(tg);
 const geometry=mergeGeometries(all.map(g=>g.index?g.toNonIndexed():g),false);all.forEach(g=>g.dispose());return geometry;
}
export function buildDolphins(scene,onSplash=()=>{}){
 const pod=new THREE.Group();pod.name='Two coastal bottlenose dolphins';pod.userData.dynamic=true;scene.add(pod);const geometry=dolphinGeometry(),dolphins=[];
 const eyeMat=standard('#1e3336',.38),mouthMat=standard('#4c666b',.62);
 for(let i=0;i<2;i++){
  const d=new THREE.Group();d.userData.dynamic=true;pod.add(d);const power=uniform(1),mat=standard('#71888e',.43,0);mat.side=THREE.DoubleSide;
  const finMask=max(smoothstep(.38,.57,positionLocal.z),smoothstep(.13,.19,abs(positionLocal.x)));
  mat.colorNode=mix(mix(color('#a4b8b4'),color('#617c82'),smoothstep(-.085,.015,positionLocal.y)),color('#4e6d73'),finMask.mul(.90));
  mat.roughnessNode=mix(.44,.68,finMask);
  mat.positionNode=positionLocal.add(vec3(0,sin(U.time.mul(2.85).add(i*1.7).sub(positionLocal.z.mul(4.8))).mul(max(positionLocal.z.add(.015),0).pow(1.6)).mul(.105).mul(power),0));
  mesh(geometry,mat,d);d.scale.setScalar(i===0?1.02:.88);d.userData.power=power;
  for(const x of [-.070,.070]){mesh(new THREE.SphereGeometry(.0105,10,6),eyeMat,d,[x,.018,-.406]);tube([[x*.25,-.016,-.666],[x*.47,-.023,-.59],[x*.57,-.025,-.49],[x*.85,-.014,-.438]],.0018,mouthMat,d,20,4);}
  mesh(new THREE.SphereGeometry(.012,10,6),mouthMat,d,[0,.128,-.306]).scale.set(1,.18,1.4);mergeActorParts(d);dolphins.push(d);
 }
 const up=new THREE.Vector3(0,1,0),matrix=new THREE.Matrix4();let clock=0,nextAuto=12,autoIndex=0,manual=false,contactError=0;
 const agents=dolphins.map((object,i)=>({object,home:i===0?-1:1,heading:i===0?-Math.PI/2:Math.PI/2,phase:'cruise',start:0,duration:0,curve:null,speed:.40,seed:i*2.1,velocity:new THREE.Vector3(),previous:new THREE.Vector3(),flight:null}));
 agents.forEach((a,i)=>a.object.position.set(a.home*2.65,-.48,3.55+(i===0?-.23:.23)));
 function orient(d,v){if(v.lengthSq()<1e-9)return;const forward=v.clone().normalize(),right=new THREE.Vector3().crossVectors(forward,up).normalize(),vertical=new THREE.Vector3().crossVectors(right,forward);matrix.makeBasis(right,vertical,forward.negate());d.quaternion.setFromRotationMatrix(matrix);}
 function point(points,q){const u=1-q;return points[0].clone().multiplyScalar(u*u*u).addScaledVector(points[1],3*u*u*q).addScaledVector(points[2],3*u*q*q).addScaledVector(points[3],q*q*q);}
 function tangent(points,q,duration){const u=1-q;return points[1].clone().sub(points[0]).multiplyScalar(3*u*u).addScaledVector(points[2].clone().sub(points[1]),6*u*q).addScaledVector(points[3].clone().sub(points[2]),3*q*q).divideScalar(duration);}
 function hermite(p,v0,end,v1,duration){return[p.clone(),p.clone().addScaledVector(v0,duration/3),end.clone().addScaledVector(v1,-duration/3),end.clone()];}
 function begin(a,index,both,t){
  const direction=-a.home,lane=both?(a.home<0?3.10:4.14):(a.home<0?3.22:3.60),startX=a.home*(both?1.75:2.80),vx=direction*(both?3.2:1.65),vy=4.95,gatherTime=1.10,approachTime=1.20,powerTime=.50;
  const launch=new THREE.Vector3(startX,wave(startX,lane,t+gatherTime+approachTime+powerTime)+.09,lane),powerStart=launch.clone().add(new THREE.Vector3(-vx*powerTime*.77,-.88,0)),v0=new THREE.Vector3(vx*.59,.18,0),p=a.object.position.clone();
  const current=a.velocity.length()>.02?a.velocity.clone():new THREE.Vector3(0,0,-1).applyQuaternion(a.object.quaternion).multiplyScalar(.34);
  const side=a.home<0?1:-1,mid=new THREE.Vector3(a.home*(both?3.95:3.90),U.tide.value-.57,lane+side*.47),midV=new THREE.Vector3(direction*.74,0,-side*.50);
  a.curve=hermite(p,current,mid,midV,gatherTime);a.duration=gatherTime;a.phase='gather';a.start=t;a.flight={launch,vx,vy,lane,home:both?-a.home:a.home,paired:both,powerTime,approachTime,approachCurve:hermite(mid,midV,powerStart,v0,approachTime),powerCurve:hermite(powerStart,v0,launch,new THREE.Vector3(vx,vy,0),powerTime)};
 }
 function jumpBoth(){if(agents.some(a=>a.phase!=='cruise'))return false;manual=true;agents.forEach((a,i)=>begin(a,i,true,clock));nextAuto=clock+34;return true;}
 function flightPosition(f,q){return new THREE.Vector3(f.launch.x+f.vx*q,f.launch.y+f.vy*q-4.905*q*q,f.lane);}
 function leadingContact(f,q,t,scale){const pos=flightPosition(f,q),v=new THREE.Vector3(f.vx,f.vy-9.81*q,0).normalize();return pos.addScaledVector(v,.667*scale).add(new THREE.Vector3(0,-.020*scale,0));}
 function step(t,dt){
  if(t>=nextAuto&&agents.every(a=>a.phase==='cruise')){begin(agents[autoIndex%2],autoIndex%2,false,t);autoIndex++;nextAuto=t+28;}
  for(let i=0;i<agents.length;i++){
   const a=agents[i],d=a.object;a.previous.copy(d.position);let analytical=null;
   if(a.phase==='cruise'){
    const phase=t*.19+a.seed,goal=new THREE.Vector3(a.home*2.65+Math.sin(phase)*.48,-.49+Math.sin(phase*.71)*.055+U.tide.value*.7,3.55+Math.cos(phase)*.43),wanted=goal.clone().sub(d.position),angle=Math.atan2(-wanted.x,-wanted.z),diff=Math.atan2(Math.sin(angle-a.heading),Math.cos(angle-a.heading));a.heading+=Math.max(-1.5*dt,Math.min(1.5*dt,diff));a.speed+=(.42*Math.max(.16,Math.cos(diff))-a.speed)*(1-Math.exp(-dt*3));d.position.x-=Math.sin(a.heading)*a.speed*dt;d.position.z-=Math.cos(a.heading)*a.speed*dt;d.position.y+=(goal.y-d.position.y)*(1-Math.exp(-dt*1.3));projectEnvironment(d.position,.23,t);
   }else if(['gather','approach','power','entry','recovery'].includes(a.phase)){
    const q=clamp((t-a.start)/a.duration);d.position.copy(point(a.curve,q));analytical=tangent(a.curve,q,a.duration);
    if(a.phase==='gather'||a.phase==='approach'||a.phase==='recovery')projectEnvironment(d.position,.18,t,false);
    if(q===1){const endTime=a.start+a.duration;
     if(a.phase==='gather'){a.phase='approach';a.start=endTime;a.duration=a.flight.approachTime;a.curve=a.flight.approachCurve;a.curve[0].copy(d.position);a.curve[1].copy(d.position).addScaledVector(analytical,a.duration/3);}
     else if(a.phase==='approach'){a.phase='power';a.start=endTime;a.duration=a.flight.powerTime;a.curve=a.flight.powerCurve;a.curve[0].copy(d.position);a.curve[1].copy(d.position).addScaledVector(analytical,a.duration/3);}
     else if(a.phase==='power'){a.phase='flight';a.start=endTime;a.flight.launch.copy(d.position);onSplash(d.position.x,d.position.z,.22,t,new THREE.Vector3(a.flight.vx,a.flight.vy,0));}
     else if(a.phase==='entry'){
      const end=new THREE.Vector3(a.home*2.60,-.52+U.tide.value*.7,3.52+(i===0?-.10:.16)),exit=end.clone().sub(d.position).setY(0).normalize().multiplyScalar(.32);a.duration=1.95;a.curve=hermite(d.position,analytical,end,exit,a.duration);a.phase='recovery';a.start=endTime;
     }else{a.phase='cruise';a.heading=Math.atan2(-analytical.x,-analytical.z);a.speed=analytical.length();}
     const remaining=Math.max(0,t-endTime);if(a.phase==='flight'){d.position.copy(flightPosition(a.flight,remaining));analytical.set(a.flight.vx,a.flight.vy-9.81*remaining,0);}else if(a.phase!=='cruise'){d.position.copy(point(a.curve,clamp(remaining/a.duration)));analytical=tangent(a.curve,clamp(remaining/a.duration),a.duration);}else d.position.addScaledVector(analytical,remaining);
    }
   }else if(a.phase==='flight'){
    const f=a.flight,q=t-a.start;d.position.copy(flightPosition(f,q));analytical=new THREE.Vector3(f.vx,f.vy-9.81*q,0);
    const nose=leadingContact(f,q,t,d.scale.x);
    if(q>f.vy/9.81&&nose.y<=wave(nose.x,nose.z,t)){
     let lo=Math.max(0,q-dt),hi=q;for(let k=0;k<16;k++){const u=(lo+hi)*.5,n=leadingContact(f,u,a.start+u,d.scale.x);if(n.y>wave(n.x,n.z,a.start+u))lo=u;else hi=u;}
     const u=(lo+hi)*.5,hitTime=a.start+u,impact=leadingContact(f,u,hitTime,d.scale.x);contactError=Math.max(contactError,Math.abs(impact.y-wave(impact.x,impact.z,hitTime)));d.position.copy(flightPosition(f,u));analytical.set(f.vx,f.vy-9.81*u,0);onSplash(impact.x,impact.z,1,hitTime,analytical.clone());a.home=f.home;
     const duration=.235,end=d.position.clone().add(new THREE.Vector3(f.vx*.18,-.88,0));end.y=Math.max(-1.04+U.tide.value*.5,end.y);const exit=new THREE.Vector3(f.vx*.48,-.65,0);a.curve=hermite(d.position,analytical,end,exit,duration);a.phase='entry';a.duration=duration;a.start=hitTime;const remainder=clamp((t-hitTime)/duration);d.position.copy(point(a.curve,remainder));analytical=tangent(a.curve,remainder,duration);
    }
   }
   a.velocity.copy(d.position).sub(a.previous).divideScalar(Math.max(.0001,dt));if(a.phase==='flight')a.velocity.copy(analytical||new THREE.Vector3(a.flight.vx,a.flight.vy-9.81*(t-a.start),0));orient(d,a.velocity);
   d.userData.power.value=a.phase==='flight'?.28:a.phase==='power'?1.85:a.phase==='entry'?.60:1;
  }
  if(agents.every(a=>a.phase==='cruise'))manual=false;
 }
 function update(t){while(clock<t-.000001){const dt=Math.min(1/90,t-clock);clock+=dt;step(clock,dt);}}
 return {dolphins,update,jumpBoth,canJump:()=>agents.every(a=>a.phase==='cruise'),info:()=>({breaching:agents.some(a=>a.phase==='flight'),phases:agents.map(a=>a.phase),manual,contactError,positions:agents.map(a=>a.object.position.toArray()),velocities:agents.map(a=>a.velocity.toArray())})};
}
