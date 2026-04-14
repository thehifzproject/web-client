import { test, expect } from 'bun:test'
import { checkArabicRecitation } from './grading'

test('identical strings match', () => {
  expect(checkArabicRecitation('بسم الله', 'بسم الله')).toBe(true)
})

test('harakat are stripped before comparison', () => {
  expect(checkArabicRecitation('بسم الله', 'بِسْمِ اللَّهِ')).toBe(true)
})

test('alef variants normalize', () => {
  expect(checkArabicRecitation('اكبر', 'أكبر')).toBe(true)
  expect(checkArabicRecitation('اله', 'إله')).toBe(true)
  expect(checkArabicRecitation('القران', 'القرآن')).toBe(true)
})

test('ya variant normalizes', () => {
  expect(checkArabicRecitation('الهدي', 'الهدى')).toBe(true)
})

test('off-by-one-letter within threshold passes', () => {
  expect(checkArabicRecitation('الرحمان', 'الرحمن')).toBe(true)
})

test('wildly different text fails', () => {
  expect(checkArabicRecitation('بسم الله', 'الحمد لله رب العالمين')).toBe(false)
})

test('empty user input fails', () => {
  expect(checkArabicRecitation('', 'بسم الله')).toBe(false)
})
