import { LinkStateService } from './link-state-service';

describe('LinkStateService', () => {
  it('should emit a refresh event when triggerRefresh is called', done => {
    const svc = new LinkStateService();
    svc.refreshLink$.subscribe(value => {
      // The first emission comes from the BehaviorSubject's initial value (false).
      // We care about the next emission triggered by triggerRefresh().
      if (value) {
        expect(value).toBeTrue();
        done();
      }
    });
    svc.triggerRefresh();
  });
});