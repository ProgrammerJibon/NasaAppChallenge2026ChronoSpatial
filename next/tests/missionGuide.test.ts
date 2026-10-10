import { describe, expect, it } from 'vitest';
import { findGuideTopic } from '../lib/missionGuide';
import { matchSkyField } from '../lib/skyFields';
import type { SkyRegion } from '../lib/types';
describe('guided questions',()=>{
  const topics=[{label:'Show Orion',answer:'Opening Orion',keywords:['orion']},{label:'What am I seeing?',answer:'An infrared image',keywords:['image','seeing']}];
  it('understands a suggested question and a simple typed request',()=>{
    expect(findGuideTopic('Show Orion',topics)?.answer).toBe('Opening Orion');
    expect(findGuideTopic('Please show Orion!',topics)?.answer).toBe('Opening Orion');
  });
  it('does not invent an answer to unsupported or empty questions',()=>{
    expect(findGuideTopic('What is my star sign?',topics)).toBeUndefined();
    expect(findGuideTopic('',topics)).toBeUndefined();
  });
});
describe('named sky fields',()=>{
  const regions=[{slug:'m31',name:'Andromeda Galaxy (M31)'},{slug:'orion',name:'Orion Nebula'}] as SkyRegion[];
  it('uses the curated field for object names instead of mismatched coordinates',()=>{
    expect(matchSkyField('show M31',regions)?.slug).toBe('m31');
    expect(matchSkyField('Orion',regions)?.slug).toBe('orion');
    expect(matchSkyField('10.5, 39.4',regions)).toBeUndefined();
  });
});
