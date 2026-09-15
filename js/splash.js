import {THREE,U,geom,wave,rng} from './core.js';

export function buildSplash(scene){
 const group=new THREE.Group();group.userData.dynamic=true;group.name='Gravity-driven re-entry spray';scene.add(group);
 const random=rng(9865),burstSize=180,count=480,particles=[];
 const material=new THREE.MeshPhysicalNodeMaterial({color:'#c4e7e2',roughness:.19,metalness:0,transparent:true,opacity:.64,depthWrite:false,ior:1.333});
 const droplets=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),material,count);droplets.castShadow=false;droplets.receiveShadow=false;droplets.frustumCulled=false;droplets.renderOrder=12;group.add(droplets);const dummy=new THREE.Object3D();for(let i=0;i<count;i++){dummy.scale.setScalar(0);dummy.updateMatrix();droplets.setMatrixAt(i,dummy.matrix);}droplets.instanceMatrix.needsUpdate=true;
 const crownMaterial=new THREE.MeshPhysicalNodeMaterial({color:'#d8f1e7',roughness:.13,metalness:0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
 const cp=[],ci=[],cu=[],segments=112,rows=7;for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,q=j/rows;cp.push(Math.cos(a)*q,0,Math.sin(a)*q);cu.push(i/segments,q);if(j<rows&&i<segments){const n=j*(segments+1)+i;ci.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1)}}
 // Independent sheets and a shared pool let both entries coexist. Launch spray
 // cannot overwrite the other dolphin's impact during an opposing jump.
 const crowns=Array.from({length:4},()=>{const crown=new THREE.Mesh(geom(cp,ci,cu),crownMaterial.clone());crown.visible=false;crown.renderOrder=11;group.add(crown);return {mesh:crown,event:null};});
 crownMaterial.dispose();let index=0,crownIndex=0,impactCount=0;
 function emit(x,z,strength=1,eventTime=U.time.value,velocity=new THREE.Vector3(1,-4,0)){
  const t=eventTime,slot=crowns[crownIndex++%crowns.length];const direction=new THREE.Vector2(velocity.x,velocity.z).normalize();slot.event={x,z,t,strength,dx:direction.x,dz:direction.y};droplets.visible=true;impactCount++;slot.mesh.visible=true;
  const amount=Math.round(burstSize*Math.min(1,strength));
  for(let k=0;k<amount;k++){const a=random()*Math.PI*2,s=(.45+random()*1.35)*strength,lift=(1.3+random()*3.3)*Math.sqrt(strength),r=.035+random()*.10;particles[index]={x:x+Math.cos(a)*r,z:z+Math.sin(a)*r,y:wave(x,z,t)+.02,vx:Math.cos(a)*s+direction.x*.90*strength,vy:lift*(.80+.20*Math.cos(a)),vz:Math.sin(a)*s+direction.y*.90*strength,t,delay:random()*.055,size:(.008+Math.pow(random(),2)*.022)*strength,drag:.6+random()*.6};index=(index+1)%count;}
 }
 function update(t){
  const g=9.81;
  let active=0;for(let i=0;droplets.visible&&i<count;i++){const p=particles[i];if(!p){dummy.scale.setScalar(0);}else{const a=t-p.t-p.delay;if(a<0){dummy.scale.setScalar(0);}else{const k=p.drag,decay=Math.exp(-k*a),travel=(1-decay)/k,x=p.x+p.vx*travel,z=p.z+p.vz*travel,y=p.y+(p.vy+g/k)*travel-g*a/k,vy=(p.vy+g/k)*decay-g/k;const alive=y>wave(x,z,t)+.005&&a<2.2;if(!alive){dummy.scale.setScalar(0);particles[i]=null;}else{active++;dummy.position.set(x,y,z);const velocity=new THREE.Vector3(p.vx*decay,vy,p.vz*decay);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),velocity.clone().normalize());const elongation=1+Math.min(2.2,velocity.length()*.24);dummy.scale.set(p.size*.76,p.size*elongation,p.size*.76);}}}dummy.updateMatrix();droplets.setMatrixAt(i,dummy.matrix);}
  droplets.instanceMatrix.needsUpdate=droplets.visible;droplets.visible=active>0;material.opacity=.64-U.night.value*.06;material.color.set('#c4e7e2').lerp(new THREE.Color('#72b9c7'),U.night.value);
  for(const slot of crowns){const event=slot.event;if(!event)continue;const crown=slot.mesh,a=t-event.t,s=event.strength,life=.57;crown.visible=a>=0&&a<life;if(crown.visible){const data=crown.geometry.attributes.position;const radial=.08+a*1.45*s;const lift=Math.max(0,2.85*a-g*a*a*.5)*Math.sqrt(s);for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++){const q=j/rows,theta=i/segments*Math.PI*2,n=j*(segments+1)+i;const lace=1+.15*Math.sin(theta*11+event.x)+.07*Math.sin(theta*23+event.z);const r=radial*(.6+q*.4)*lace;const along=Math.cos(theta)*r*1.28+a*s*.34,across=Math.sin(theta)*r*.73,fan=.28+.72*Math.pow(.5+.5*Math.cos(theta),1.3);data.setXYZ(n,event.dx*along-event.dz*across,lift*q*fan*(.88+.12*Math.sin(theta*13))-.035*q,event.dz*along+event.dx*across);}data.needsUpdate=true;crown.geometry.computeVertexNormals();crown.position.set(event.x,wave(event.x,event.z,t)+.006,event.z);crown.material.opacity=Math.max(0,1-a/life)*.31;}else if(a>=life)slot.event=null;}
 }
 return {emit,update,info:()=>({impactCount,activeDroplets:particles.filter(Boolean).length,activeCrowns:crowns.filter(s=>s.mesh.visible).length})};
}
