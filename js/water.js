import {THREE,U,geom,mesh,height,heightNode,waveNode,waveGradientNode,shoreNode,shelterNode} from './core.js';
import {wetSurfaceGeometry,edge,boundary,contactTexture} from './terrain.js';
import {Fn,float,vec2,vec3,vec4,positionLocal,positionWorld,normalWorld,screenUV,texture,cameraPosition,cameraProjectionMatrixInverse,cameraWorldMatrix,getViewPosition,uniform,sin,cos,abs,max,min,mix,smoothstep,exp,pow,dot,normalize,reflect,mx_noise_float,color,attribute,Discard,If} from 'three/tsl';

function opticalTarget(w,h){const rt=new THREE.RenderTarget(w,h,{type:THREE.HalfFloatType,depthBuffer:true,samples:0});rt.depthTexture=new THREE.DepthTexture(w,h,THREE.UnsignedIntType);return rt;}
function reflectionTarget(w,h){return new THREE.RenderTarget(w,h,{type:THREE.HalfFloatType,depthBuffer:true,samples:4});}
export function buildWater(scene){
 const group=new THREE.Group();group.name='Clipped continuous sea section';group.userData.pickRole='water';scene.add(group);
 const reflection={target:new THREE.Object3D(),reflector:{resolutionScale:.5},camera:new THREE.PerspectiveCamera(),rt:reflectionTarget(720,500)};
 const reflectedTexture=texture(reflection.rt.texture),reflectionMatrix=uniform(new THREE.Matrix4());
 let refractionRT=opticalTarget(1440,1000);const refracted=texture(refractionRT.texture),sceneDepth=texture(refractionRT.depthTexture),contacts=texture(contactTexture);
 const worldAt=Fn(([uv])=>cameraWorldMatrix.mul(vec4(getViewPosition(uv,sceneDepth.sample(uv).r,cameraProjectionMatrixInverse),1)).xyz);
 const contour=boundary.filter((p,i)=>i%8===0||p.distanceTo(new THREE.Vector2(3.75,5.05))<.01||p.distanceTo(new THREE.Vector2(-4,5.2))<.01||p.distanceTo(new THREE.Vector2(5.88,1.3))<.01);
 const layer=typeof location==='undefined'?'':new URLSearchParams(location.search).get('layer');
 const transmission=Fn(([p,offset,isSide])=>{
  const base=screenUV.clamp(.001,.999),candidate=base.add(offset).clamp(.002,.998),sample=worldAt(candidate),undistorted=worldAt(base);
  // A displaced sample must be behind this interface and under the sea. Dry silhouettes never refract.
  const validDepth=float(1).sub(smoothstep(.9997,.99999,sceneDepth.sample(candidate).r));
  const underwater=float(1).sub(smoothstep(U.tide.sub(.025),U.tide.add(.018),sample.y));
  const behind=smoothstep(0,.10,dot(sample.sub(p),normalize(p.sub(cameraPosition))));
  const stability=float(1).sub(smoothstep(.25,1.1,sample.distance(undistorted)));
  const safeUV=mix(base,candidate,validDepth.mul(underwater).mul(behind).mul(stability));
  const end=worldAt(safeUV),ray=normalize(p.sub(cameraPosition));
  const distance=max(dot(end.sub(p),ray),0);
  const upwardExit=max(U.tide.sub(p.y),0).div(max(ray.y,.0001));
  const waterExit=mix(float(16),upwardExit,smoothstep(.001,.012,ray.y));
  let cutExit=float(100);for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length],normal=new THREE.Vector2(b.y-a.y,a.x-b.x).normalize(),n=vec2(normal.x,normal.y),den=dot(n,ray.xz),hit=max(float(normal.dot(a)+.06).sub(dot(n,p.xz)),0).div(max(den,.0001));cutExit=min(cutExit,mix(100,hit,smoothstep(.0001,.001,den)));}
  const path=min(min(distance,waterExit),cutExit).clamp(0,14);
  const absorption=exp(vec3(.78,.13,.079).mul(path).negate());
  const tint=mix(color('#0cabb5'),color('#234a6c'),U.night);
  const source=refracted.sample(safeUV).rgb;
  return source.mul(absorption).add(tint.mul(vec3(1).sub(absorption)).mul(.55).mul(exp(max(U.tide.sub(p.y),0).mul(-.13))));
 });
 const material=new THREE.MeshBasicNodeMaterial({transparent:true,depthWrite:true,side:THREE.FrontSide});
 const pl=positionLocal;material.positionNode=vec3(pl.x,waveNode(pl.x,pl.z),pl.z);
 material.colorNode=Fn(()=>{
  const p=positionWorld,t=U.time,depth=p.y.sub(heightNode(p.x,p.z));If(depth.lessThan(-.001),()=>{Discard();});
  const gradient=waveGradientNode(p.x,p.z);
  const fine=vec2(cos(p.x.mul(31).add(p.z.mul(18)).sub(t.mul(2.1))),sin(p.x.mul(19).sub(p.z.mul(27)).sub(t.mul(1.7)))).mul(.005).mul(U.breeze.add(.16)).mul(shelterNode(p.x,p.z));
  const n=normalize(vec3(gradient.x.negate().add(fine.x),1,gradient.y.negate().add(fine.y))),v=normalize(cameraPosition.sub(p)),nv=max(dot(n,v),.02);
  const transmitted=transmission(p,n.xz.mul(.033).mul(smoothstep(0,.28,depth)),float(0));
  const projected=reflectionMatrix.mul(vec4(p,1)),uv=projected.xy.div(projected.w).mul(.5).add(.5);
  const reflectionUV=vec2(uv.x,float(1).sub(uv.y)).add(n.xz.mul(.017)).clamp(.002,.998);
  const reflected=reflectedTexture.sample(reflectionUV).rgb;
  const fresnel=float(.023).add(pow(float(1).sub(nv),5).mul(.85));
  const sunAlignment=max(dot(reflect(U.sun.negate(),n),v),0);
  const sparkle=pow(sunAlignment,650).mul(.44).add(pow(sunAlignment,90).mul(.007));
  let result=mix(transmitted,reflected,fresnel).add(mix(vec3(1,.94,.80),vec3(.22,.32,.49),U.night).mul(sparkle));
  const noise=mx_noise_float(vec3(p.xz.mul(9.2),t.mul(.21))).mul(.5).add(.5);
  const phase=t.mul(1.02).add(p.z.mul(1.65)).add(p.x.mul(.24));
  const arrival=smoothstep(.35,.88,sin(phase));
  const contactBand=float(1).sub(smoothstep(.006,.065,depth.add(noise.mul(.025))));
  const shoreFoam=contactBand.mul(smoothstep(-.001,.011,depth)).mul(arrival).mul(smoothstep(.30,.65,noise)).mul(.52);
  const crest=pow(max(sin(phase.add(p.z.sub(shoreNode(p.x)).mul(3.7))),0),30).mul(float(1).sub(smoothstep(.12,.6,depth))).mul(smoothstep(.035,.11,depth)).mul(.10);
  const contact=contacts.sample(vec2(p.x.add(6.5).div(13),p.z.add(4.9).div(10.5)).clamp(0,1)).r.mul(1.2).sub(.6);
  const rockBand=float(1).sub(smoothstep(.012,.085,abs(contact.sub(.018).sub(sin(phase).mul(.018)))));
  const rockFoam=rockBand.mul(smoothstep(-.01,.02,contact)).mul(arrival).mul(smoothstep(.33,.62,noise)).mul(.50);
  const foam=shoreFoam.add(rockFoam).add(crest.mul(noise)).clamp(0,.63);
  result=mix(result,mix(color('#eaf3e5'),color('#90aabc'),U.night),foam);
  let touch=float(0);for(const r of U.ripples){const d=p.xz.sub(r.xy).length(),age=t.sub(r.z);touch=touch.add(exp(d.sub(age.mul(1.25)).pow(2).mul(-25)).mul(exp(max(age,0).mul(-1.15))).mul(smoothstep(0,.15,age)).mul(r.w));}
  const bio=touch.mul(.18).add(foam.mul(arrival.pow(3)).mul(.035)).mul(U.night);
  if(layer==='sun')return vec3(sparkle);if(layer==='reflection')return reflected.mul(fresnel);if(layer==='foam')return vec3(foam);if(layer==='refraction')return transmitted;
  return result.add(vec3(.025,.52,.57).mul(bio));
 })();
 const top=mesh(wetSurfaceGeometry(.48,78),material,group);top.renderOrder=10;top.castShadow=false;top.receiveShadow=false;top.name='Wet-region refractive waves';
 // Every exposed strip shares its upper vertices with the radial top mesh. Dry perimeter has no strip.
 const sp=[],si=[],weights=[],rows=12;
 for(let i=0;i<edge.length;i++){
  let a=edge[i].clone(),b=edge[(i+1)%edge.length].clone(),ha=height(a.x,a.y),hb=height(b.x,b.y);if(ha>.48&&hb>.48)continue;
  if(ha>.48){a.lerp(b,(.48-ha)/(hb-ha));ha=height(a.x,a.y);}else if(hb>.48){b.lerp(a,(.48-hb)/(ha-hb));hb=height(b.x,b.y);}
  const start=sp.length/3;for(let j=0;j<=rows;j++){const q=j/rows;sp.push(a.x,ha*q,a.y,b.x,hb*q,b.y);weights.push(1-q,1-q);if(j<rows){const k=start+j*2;si.push(k,k+1,k+2,k+1,k+3,k+2);}}
 }
 const sideG=geom(sp,si);sideG.setAttribute('waterWeight',new THREE.Float32BufferAttribute(weights,1));
 const sidesMat=new THREE.MeshBasicNodeMaterial({transparent:true,side:THREE.FrontSide,depthWrite:true});
 sidesMat.positionNode=vec3(pl.x,pl.y.add(waveNode(pl.x,pl.z).mul(attribute('waterWeight','float'))),pl.z);
 sidesMat.colorNode=Fn(()=>{
  const p=positionWorld;If(p.y.lessThan(heightNode(p.x,p.z).sub(.005)),()=>{Discard();});If(p.y.greaterThan(waveNode(p.x,p.z).add(.003)),()=>{Discard();});
  const d=max(U.tide.sub(p.y),0),grad=waveGradientNode(p.x,p.z),ripple=sin(p.y.mul(16).add(p.x.mul(6)).sub(U.time.mul(1.02))).mul(.00045);
  const distortion=vec2(grad.x.mul(.008).add(ripple),grad.y.mul(.002)).mul(exp(d.mul(-.40)));
  return transmission(p,distortion,float(1));
 })();
 const sides=mesh(sideG,sidesMat,group);sides.renderOrder=9;sides.castShadow=false;sides.receiveShadow=false;sides.name='Depth-aware exposed sea section';
 const profile={reflectionCalls:0,refractionCalls:0,reflectionMs:0,refractionMs:0};
 function renderReflection(renderer,camera,updateReflection=true){
  const size=renderer.getDrawingBufferSize(new THREE.Vector2()),scale=reflection.reflector.resolutionScale,w=Math.round(size.x*scale),h=Math.round(size.y*scale);
  if(reflection.rt.width!==w||reflection.rt.height!==h){const old=reflection.rt;reflection.rt=reflectionTarget(w,h);reflectedTexture.value=reflection.rt.texture;old.dispose();updateReflection=true;}
  group.visible=false;
  if(updateReflection){
   const rc=reflection.camera;rc.copy(camera);rc.position.copy(camera.position);rc.position.y=2*U.tide.value-camera.position.y;
   const dir=new THREE.Vector3();camera.getWorldDirection(dir);dir.y=-dir.y;rc.up.copy(camera.up);rc.up.y*=-1;rc.lookAt(rc.position.clone().add(dir));rc.updateMatrixWorld(true);
   // Use the mirrored camera's complete projective mapping, including its orientation.
   reflectionMatrix.value.multiplyMatrices(rc.projectionMatrix,rc.matrixWorldInverse);
   const clipPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-U.tide.value+.018).applyMatrix4(rc.matrixWorldInverse),cp=new THREE.Vector4(clipPlane.normal.x,clipPlane.normal.y,clipPlane.normal.z,clipPlane.constant),pm=rc.projectionMatrix.elements;
   const q=new THREE.Vector4((Math.sign(cp.x)+pm[8])/pm[0],(Math.sign(cp.y)+pm[9])/pm[5],-1,(1+pm[10])/pm[14]);cp.multiplyScalar((renderer.coordinateSystem===THREE.WebGPUCoordinateSystem?1:2)/cp.dot(q));pm[2]=cp.x;pm[6]=cp.y;pm[10]=renderer.coordinateSystem===THREE.WebGPUCoordinateSystem?cp.z:cp.z+1;pm[14]=cp.w;rc.projectionMatrixInverse.copy(rc.projectionMatrix).invert();
   renderer.setRenderTarget(reflection.rt);let calls=renderer.info.render.drawCalls,start=performance.now();renderer.render(scene,rc);profile.reflectionCalls=renderer.info.render.drawCalls-calls;profile.reflectionMs=performance.now()-start;
  }
  if(refractionRT.width!==size.x||refractionRT.height!==size.y){const old=refractionRT;refractionRT=opticalTarget(size.x,size.y);refracted.value=refractionRT.texture;sceneDepth.value=refractionRT.depthTexture;old.dispose();}
  renderer.setRenderTarget(refractionRT);let calls=renderer.info.render.drawCalls,start=performance.now();renderer.render(scene,camera);profile.refractionCalls=renderer.info.render.drawCalls-calls;profile.refractionMs=performance.now()-start;renderer.setRenderTarget(null);group.visible=true;
 }
 return {group,top,sides,reflection,renderReflection,profile};
}
