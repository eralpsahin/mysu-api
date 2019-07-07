import { resolve } from 'path';
import { config } from 'dotenv';
import mysu from '../src/index';

config({ path: resolve(__dirname, '../.env') });

test('empty credentials authentication', async () => {
  expect(await mysu.authenticate()).toBe(1);
});

test('wrong credentials authentication', async () => {
  expect(await mysu.authenticate('test', 'test')).toBe(1);
});

const conditional =
  !!process.env.AUTH_USER && !!process.env.AUTH_PASS ? test : test.skip;

conditional('correct credentials authentication', async () => {
  expect(
    await mysu.authenticate(process.env.AUTH_USER, process.env.AUTH_PASS)
  ).toBe(0);
});
