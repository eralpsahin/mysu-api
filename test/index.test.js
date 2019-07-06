import mysu from '../src';

test('Failed Authentication', async () => {
  expect(await mysu.authenticate()).toBe(1);
  expect(await mysu.authenticate('test', 'test')).toBe(1);
});
