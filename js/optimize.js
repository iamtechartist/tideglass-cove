import {THREE,mergeGeometries} from './core.js';
export function inheritedRole(m){for(let p=m;p;p=p.parent)if(p.userData.pickRole)return p.userData.pickRole;return 'scenery';}
export function batchStatics(scene){
 scene.updateMatrixWorld(true);const groups=new Map();
 scene.traverse(m=>{if(!m.isMesh||Array.isArray(m.material)||m.material.transparent||m.material.positionNode||m.material.userData.keepLocal)return;let p=m;while(p){if(p.userData.dynamic)return;p=p.parent;}const role=inheritedRole(m);if(role==='camper')m.layers.enable(2);const key=m.material.uuid+':'+m.castShadow+':'+m.receiveShadow+':'+role+':'+m.layers.mask;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);});
 for(const entries of groups.values()){if(entries.length<3)continue;const geos=entries.map(m=>{const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);for(const a of Object.keys(g.attributes))if(a!=='position'&&a!=='normal')g.deleteAttribute(a);return g;});const g=mergeGeometries(geos,false);if(!g)continue;const m=new THREE.Mesh(g,entries[0].material);m.castShadow=entries[0].castShadow;m.receiveShadow=entries[0].receiveShadow;m.layers.mask=entries[0].layers.mask;m.userData.pickRole=inheritedRole(entries[0]);m.name='Batched '+m.userData.pickRole+' surfaces';scene.add(m);for(const old of entries)old.removeFromParent();geos.forEach(x=>x.dispose());}
}
// Merge fixed pieces in an actor's own coordinates; preserve moving tail and door pivots.
export function mergeActorParts(group,exclude=[]){
 const buckets=new Map();for(const m of [...group.children]){if(!m.isMesh||exclude.includes(m)||Array.isArray(m.material)||m.material.transparent)continue;m.updateMatrix();const key=m.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(m);}
 for(const objects of buckets.values()){if(objects.length<2)continue;const geometries=objects.map(m=>{const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);for(const a of Object.keys(g.attributes))if(!['position','normal'].includes(a))g.deleteAttribute(a);return g;});const merged=new THREE.Mesh(mergeGeometries(geometries,false),objects[0].material);merged.castShadow=true;merged.receiveShadow=true;group.add(merged);objects.forEach(m=>m.removeFromParent());geometries.forEach(g=>g.dispose());}
}
