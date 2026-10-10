import { describe, expect, it, vi, beforeEach } from 'vitest';
const database=vi.hoisted(()=>({query:vi.fn(),execute:vi.fn()}));
const comparisons=vi.hoisted(()=>({getComparisonById:vi.fn()}));
vi.mock('../src/db/connection.js',()=>database);
vi.mock('../src/services/comparison.service.js',()=>comparisons);
import { getNextReviewItem } from '../src/services/review.service.js';
describe('review queue',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it('ends the queue instead of returning an already reviewed fallback',async()=>{
    database.query.mockResolvedValue([]);
    expect(await getNextReviewItem('visitor')).toBeNull();
    expect(database.query).toHaveBeenCalledTimes(1);
  });
  it('excludes skipped candidates with SQL parameters',async()=>{
    database.query.mockResolvedValue([]);
    await getNextReviewItem('visitor',['candidate-one','candidate-two']);
    const [sql,values]=database.query.mock.calls[0];
    expect(sql).toContain('AND c.id NOT IN (?,?)');
    expect(values).toEqual(['visitor','candidate-one','candidate-two']);
  });
  it('loads the next eligible candidate and its observation pair',async()=>{
    database.query.mockResolvedValue([{id:'candidate-next',comp_id:'comparison'}]);
    comparisons.getComparisonById.mockResolvedValue({id:'comparison'});
    const item=await getNextReviewItem('visitor');
    expect(item?.candidateId).toBe('candidate-next');
    expect(item?.comparison).toEqual({id:'comparison'});
  });
});
