import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
const services=vi.hoisted(()=>({getNextReviewItem:vi.fn(),submitReview:vi.fn(),getReviewStats:vi.fn()}));
vi.mock('../src/services/review.service.js',()=>services);
import { getNext, submit } from '../src/controllers/reviews.controller.js';
import { sha256 } from '../src/utils/hash.js';
const response=()=>{const res={status:vi.fn(),json:vi.fn()};res.status.mockReturnValue(res);return res as unknown as Response;};
describe('anonymous review identity',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it('uses the same hashed visitor identity for retrieval and submission',async()=>{
    services.getNextReviewItem.mockResolvedValue({candidateId:'candidate'});
    services.submitReview.mockResolvedValue('review');
    const visitor='v_example';
    await getNext({headers:{'x-visitor-id':visitor},query:{}} as unknown as Request,response());
    await submit({body:{comparisonId:'comparison',candidateId:'candidate',visitorHash:visitor,classification:'Unsure',confidence:.7}} as Request,response());
    expect(services.getNextReviewItem).toHaveBeenCalledWith(sha256(visitor),[]);
    expect(services.submitReview).toHaveBeenCalledWith('comparison','candidate',sha256(visitor),'Unsure',.7);
  });
  it('filters malformed skip identifiers before querying the queue',async()=>{
    services.getNextReviewItem.mockResolvedValue(null);
    await getNext({headers:{'x-visitor-id':'visitor'},query:{exclude:"safe-id,unsafe'",}} as unknown as Request,response());
    expect(services.getNextReviewItem).toHaveBeenCalledWith(sha256('visitor'),['safe-id']);
  });
});
