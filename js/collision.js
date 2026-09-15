import {THREE,height,wave} from './core.js';
import {edge,inside} from './terrain.js';

// Conservative collision envelopes follow the authored terrain and stone shelves.
// They deliberately include a small clearance beyond the visible rock surface.
export const reefColliders=[
 [-5.05,.6,.70,.45,.62],[-4.7,1.18,.49,.32,.40],[-5.28,-.2,.49,.42,.59],
 [4.7,1.38,.76,.55,.54],[4.85,2.06,.39,.37,.43],[3.27,2.9,.61,.32,.40],
 [2.63,2.8,.35,.24,.30],[-2.1,3.25,.40,.20,.28],[-1.78,3.4,.24,.17,.21],[.7,1.85,.35,.24,.33],
 [4.2,2.05,.85,.43,.80],[3.75,2.55,.52,.30,.49],[-3.8,2.1,.56,.30,.53],[-4.1,2.4,.46,.26,.43],[1.8,4.40,.47,.29,.45]
].map(([x,z,rx,ry,rz])=>({center:new THREE.Vector3(x,height(x,z)+ry*.48,z),radii:new THREE.Vector3(rx,ry,rz)}));
reefColliders.push({center:new THREE.Vector3(2.35,-.12,-.25),radii:new THREE.Vector3(.72,.93,.75)},{center:new THREE.Vector3(4.87,-.10,-.10),radii:new THREE.Vector3(.65,.96,.71)},{center:new THREE.Vector3(3.32,.20,-1.98),radii:new THREE.Vector3(1.12,1.20,.30)});
const a=new THREE.Vector3(),q=new THREE.Vector3();
export function projectEllipsoid(p,c,r,margin=.15){
 const rx=r.x+margin,ry=r.y+margin,rz=r.z+margin;const dx=p.x-c.x,dy=p.y-c.y,dz=p.z-c.z;const length=Math.hypot(dx/rx,dy/ry,dz/rz);
 if(length<1){if(length<.00001){p.y=c.y+ry;return true;}p.set(c.x+dx/length,c.y+dy/length,c.z+dz/length);return true;}return false;
}
export function projectEnvironment(p,r=.15,t=0,ceiling=true){
 let collisions=0;
 for(let iteration=0;iteration<3;iteration++){
  const minY=height(p.x,p.z)+r+.025,maxY=wave(p.x,p.z,t)-r-.045;
  if(ceiling&&minY>maxY){p.z+=.12;collisions++;}
  if(p.y<minY){p.y=minY;collisions++;}if(ceiling&&p.y>maxY){p.y=maxY;collisions++;}
  for(const rock of reefColliders)if(projectEllipsoid(p,rock.center,rock.radii,r+.018))collisions++;
 }
 if(p.x> -4&&p.x<3.5&&p.z>.3&&p.z<4.3)return collisions;
 let closest=Infinity,cx=0,cz=0;
 for(let i=0;i<edge.length;i++){const aa=edge[i],bb=edge[(i+1)%edge.length],dx=bb.x-aa.x,dz=bb.y-aa.y,den=dx*dx+dz*dz;if(den<1e-12)continue;const u=Math.max(0,Math.min(1,((p.x-aa.x)*dx+(p.z-aa.y)*dz)/den)),x=aa.x+dx*u,z=aa.y+dz*u,dist=Math.hypot(p.x-x,p.z-z);if(dist<closest){closest=dist;cx=x;cz=z;}}
 const isInside=inside(p.x,p.z);if(!isInside||closest<r+.065){let dx=p.x-cx,dz=p.z-cz,len=Math.hypot(dx,dz)||1;if(!isInside){dx=-dx;dz=-dz;}p.x=cx+dx/len*(r+.067);p.z=cz+dz/len*(r+.067);collisions++;}
 return collisions;
}
export function capsuleDistance(point,object,halfLength=.48){
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(object.quaternion),delta=point.clone().sub(object.position),along=Math.max(-halfLength,Math.min(halfLength,delta.dot(forward)));const closest=object.position.clone().addScaledVector(forward,along);return {closest,distance:point.distanceTo(closest)};
}
export function projectCapsule(point,object,radius=.27,ownRadius=.15){const {closest,distance}=capsuleDistance(point,object);const min=radius+ownRadius+.035;if(distance<min){const dir=point.clone().sub(closest);if(dir.lengthSq()<1e-10)dir.set(0,0,1);point.copy(closest).addScaledVector(dir.normalize(),min);return true;}return false;}
