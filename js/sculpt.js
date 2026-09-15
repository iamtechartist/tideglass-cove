import {THREE} from './core.js';

// Signed-distance meshing joins the shoulders, roof and interior into one solid.
export const smin=(a,b,k)=>{const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return b+(a-b)*h-k*h*(1-h)};
export function roundedBox(x,y,z,bx,by,bz,r){const a=Math.abs(x)-bx,b=Math.abs(y)-by,c=Math.abs(z)-bz;return Math.hypot(Math.max(a,0),Math.max(b,0),Math.max(c,0))+Math.min(Math.max(a,b,c),0)-r}
export function isoSurface(field,min,max,step=.075){
 const nx=Math.ceil((max[0]-min[0])/step),ny=Math.ceil((max[1]-min[1])/step),nz=Math.ceil((max[2]-min[2])/step),sx=(max[0]-min[0])/nx,sy=(max[1]-min[1])/ny,sz=(max[2]-min[2])/nz;
 const grid=new Float32Array((nx+1)*(ny+1)*(nz+1)),at=(i,j,k)=>(k*(ny+1)+j)*(nx+1)+i;
 for(let k=0;k<=nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)grid[at(i,j,k)]=field(min[0]+i*sx,min[1]+j*sy,min[2]+k*sz);
 const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],positions=[],normals=[];
 const normal=(p)=>{const e=.003;return new THREE.Vector3(field(p.x+e,p.y,p.z)-field(p.x-e,p.y,p.z),field(p.x,p.y+e,p.z)-field(p.x,p.y-e,p.z),field(p.x,p.y,p.z+e)-field(p.x,p.y,p.z-e)).normalize()};
 function triangle(a,b,c){const n=normal(a.clone().add(b).add(c).multiplyScalar(1/3)),cross=b.clone().sub(a).cross(c.clone().sub(a));if(cross.dot(n)<0)[b,c]=[c,b];for(const v of [a,b,c]){positions.push(v.x,v.y,v.z);const nn=normal(v);normals.push(nn.x,nn.y,nn.z)}}
 for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const vals=corners.map(c=>grid[at(i+c[0],j+c[1],k+c[2])]);if(vals.every(v=>v>=0)||vals.every(v=>v<0))continue;
  const points=corners.map(c=>new THREE.Vector3(min[0]+(i+c[0])*sx,min[1]+(j+c[1])*sy,min[2]+(k+c[2])*sz));
  for(const tet of tets){const cut=[];for(const [aa,bb] of pairs){const a=tet[aa],b=tet[bb];if((vals[a]<0)===(vals[b]<0))continue;cut.push(points[a].clone().lerp(points[b],vals[a]/(vals[a]-vals[b])))}if(cut.length===3)triangle(...cut);else if(cut.length===4){const center=cut.reduce((a,b)=>a.add(b),new THREE.Vector3()).multiplyScalar(.25),n=normal(center),u=cut[0].clone().sub(center).normalize(),v=n.clone().cross(u);cut.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(v),a.clone().sub(center).dot(u))-Math.atan2(b.clone().sub(center).dot(v),b.clone().sub(center).dot(u)));triangle(cut[0],cut[1],cut[2]);triangle(cut[0],cut[2],cut[3])}}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));return g;
}
