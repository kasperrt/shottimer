import { expect, test } from 'vitest';
import { Router } from './router';

test('matches the host, game invitations and missing pages', () => {
  expect(Router.match('/')).toMatchObject([{ path: '/' }]);
  expect(Router.match('/abcde')).toMatchObject([{ path: '/:id', params: { id: 'abcde' } }]);
  expect(Router.match('/abcde/missing')).toMatchObject([{ path: '*404' }]);
});
