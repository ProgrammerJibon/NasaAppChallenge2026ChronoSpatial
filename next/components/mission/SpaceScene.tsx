import { RiRocket2Line } from "react-icons/ri";
export type SceneKind = "planet" | "galaxy" | "blackhole" | "ship";
export function SpaceScene({kind}:{kind:SceneKind}) {
  return <div className={`mission-scene scene-${kind}`} aria-hidden="true">
    {Array.from({length:18},(_,i)=><i className="scene-star" key={i} style={{left:`${(i*37+7)%100}%`,top:`${(i*23+11)%100}%`,animationDelay:`${i*.3}s`}} />)}
    <div className="scene-orbit" /><div className="scene-world" /><div className="galaxy-art" /><div className="blackhole-art" /><div className="spaceship-art"><RiRocket2Line /><span /></div>
  </div>;
}
