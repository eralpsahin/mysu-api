import { resolve } from 'path';
import { config } from 'dotenv';
import mysu from '../src/index';

config({ path: resolve(__dirname, '../.env') });

test('Empty Credentials Authentication', async () => {
  expect(await mysu.authenticate()).toBe(1);
});

test('Wrong Credentials Authentication', async () => {
  expect(await mysu.authenticate('test', 'test')).toBe(1);
});

const conditional =
  !!process.env.AUTH_USER && !!process.env.AUTH_PASS ? test : test.skip;

conditional('Correct Credentials Authentication', async () => {
  expect(
    await mysu.authenticate(process.env.AUTH_USER, process.env.AUTH_PASS)
  ).toBe(0);
});

test('Retrieve SuCard Transaction History', async () => {
  const expected = expect(await mysu.sucard('eralp'));
  expected.toHaveProperty('meals');
  expected.toHaveProperty('transports');
  expected.toHaveProperty('prints');
});

test('Retrieve Course Schedule', async () => {
  const expected = expect(await mysu.courseSchedule('eralpsahin'));
  expected.toEqual({});
});
