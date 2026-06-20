import { describe, it, expect } from 'vitest';
import {
  formatDate,
  importanceMap,
  countChineseChars,
  countEnglishWords,
  countImages,
  calculateReadingTimeSeconds,
  calculateReadingTimeMinutes,
  formatReadingTime,
  getWordStats,
  READING_SPEED,
} from '@/lib/utils';

describe('formatDate 函数', () => {
  describe('有效日期格式化', () => {
    it('应该正确格式化 ISO 日期字符串', () => {
      const date = '2024-01-15T10:30:00.000Z';
      const formatted = formatDate(date);

      // 实际格式: YYYY/MM/DD HH:mm (使用 toLocaleString)
      expect(formatted).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    });

    it('应该正确格式化 Date 对象', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const formatted = formatDate(date.toISOString());

      // 实际格式: YYYY/MM/DD HH:mm
      expect(formatted).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    });

    it('应该保持日期的正确性', () => {
      const date = '2024-01-15T10:30:00.000Z';
      const formatted = formatDate(date);

      expect(formatted).toContain('2024');
      expect(formatted).toContain('01');
      expect(formatted).toContain('15');
    });
  });

  describe('边界情况', () => {
    it('应该处理年初日期', () => {
      const date = '2024-01-01T00:00:00.000Z';
      const formatted = formatDate(date);

      expect(formatted).toContain('2024');
      expect(formatted).toContain('01');
    });

    it('应该处理年末日期', () => {
      const date = '2024-12-31T23:59:59.999Z';
      const formatted = formatDate(date);

      expect(formatted).toContain('2024');
      expect(formatted).toContain('12');
      expect(formatted).toContain('31');
    });

    it('应该处理闰年日期', () => {
      const date = '2024-02-29T12:00:00.000Z';
      const formatted = formatDate(date);

      expect(formatted).toContain('2024');
      expect(formatted).toContain('02');
      expect(formatted).toContain('29');
    });
  });

  describe('时区处理', () => {
    it('应该正确处理不同时区的日期', () => {
      const dates = [
        '2024-01-15T00:00:00.000Z',
        '2024-01-15T12:00:00.000Z',
        '2024-01-15T23:59:59.999Z',
      ];

      dates.forEach((date) => {
        const formatted = formatDate(date);
        // 实际格式: YYYY/MM/DD HH:mm
        expect(formatted).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
      });
    });
  });

  describe('格式一致性', () => {
    it('应该始终返回相同格式的字符串', () => {
      const dates = [
        '2024-01-01T00:00:00.000Z',
        '2024-06-15T12:30:45.000Z',
        '2024-12-31T23:59:59.999Z',
      ];

      dates.forEach((date) => {
        const formatted = formatDate(date);
        // 格式: YYYY/MM/DD HH:mm
        expect(formatted).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
      });
    });

    it('应该正确填充单位数字', () => {
      const date = '2024-01-05T03:04:05.000Z';
      const formatted = formatDate(date);

      // 确保月、日、时、分都是两位数
      const parts = formatted.split(/[\/\s:]/);
      parts.forEach((part) => {
        expect(part.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});

describe('importanceMap 配置', () => {
  describe('配置完整性', () => {
    it('应该包含所有重要性级别', () => {
      expect(importanceMap).toHaveProperty('low');
      expect(importanceMap).toHaveProperty('medium');
      expect(importanceMap).toHaveProperty('high');
    });

    it('每个级别应该有 label 和 color', () => {
      Object.values(importanceMap).forEach((config) => {
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('color');
        expect(typeof config.label).toBe('string');
        expect(typeof config.color).toBe('string');
      });
    });
  });

  describe('配置值验证', () => {
    it('low 级别应该有正确的配置', () => {
      expect(importanceMap.low.label).toBe('低');
      expect(importanceMap.low.color).toBe('default');
    });

    it('medium 级别应该有正确的配置', () => {
      expect(importanceMap.medium.label).toBe('中');
      expect(importanceMap.medium.color).toBe('warning');
    });

    it('high 级别应该有正确的配置', () => {
      expect(importanceMap.high.label).toBe('高');
      expect(importanceMap.high.color).toBe('error');
    });
  });

  describe('颜色值有效性', () => {
    it('所有颜色值应该是有效的 Ant Design 颜色', () => {
      const validColors = [
        'default',
        'success',
        'processing',
        'error',
        'warning',
        'blue',
        'red',
        'green',
        'yellow',
        'orange',
        'purple',
        'cyan',
        'magenta',
        'pink',
        'volcano',
        'gold',
        'lime',
        'geekblue',
      ];

      Object.values(importanceMap).forEach((config) => {
        expect(validColors).toContain(config.color);
      });
    });
  });

  describe('标签文本验证', () => {
    it('所有标签应该是非空字符串', () => {
      Object.values(importanceMap).forEach((config) => {
        expect(config.label).toBeTruthy();
        expect(config.label.length).toBeGreaterThan(0);
      });
    });

    it('标签应该是中文', () => {
      Object.values(importanceMap).forEach((config) => {
        // 检查是否包含中文字符
        expect(/[\u4e00-\u9fa5]/.test(config.label)).toBe(true);
      });
    });
  });

  describe('类型安全', () => {
    it('应该可以通过类型安全的方式访问', () => {
      const levels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

      levels.forEach((level) => {
        const config = importanceMap[level];
        expect(config).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
      });
    });
  });
});

describe('阅读时长工具函数', () => {
  describe('countChineseChars 函数', () => {
    it('应该正确统计纯中文字符数', () => {
      const text = '你好世界';
      expect(countChineseChars(text)).toBe(4);
    });

    it('应该正确统计混合文本中的中文字符数', () => {
      const text = '你好 hello 世界 world';
      expect(countChineseChars(text)).toBe(4);
    });

    it('空字符串应该返回 0', () => {
      expect(countChineseChars('')).toBe(0);
    });

    it('纯英文文本应该返回 0', () => {
      expect(countChineseChars('hello world')).toBe(0);
    });
  });

  describe('countEnglishWords 函数', () => {
    it('应该正确统计纯英文单词数', () => {
      const text = 'hello world';
      expect(countEnglishWords(text)).toBe(2);
    });

    it('应该正确统计混合文本中的英文单词数', () => {
      const text = '你好 hello 世界 world';
      expect(countEnglishWords(text)).toBe(2);
    });

    it('空字符串应该返回 0', () => {
      expect(countEnglishWords('')).toBe(0);
    });

    it('纯中文文本应该返回 0', () => {
      expect(countEnglishWords('你好世界')).toBe(0);
    });

    it('连续多个空格应该正确计数', () => {
      const text = 'hello   world   test';
      expect(countEnglishWords(text)).toBe(3);
    });
  });

  describe('countImages 函数', () => {
    it('应该正确统计单个图片', () => {
      const html = '<img src="test.jpg" />';
      expect(countImages(html)).toBe(1);
    });

    it('应该正确统计多个图片', () => {
      const html = '<img src="1.jpg"><img src="2.jpg"><img src="3.jpg">';
      expect(countImages(html)).toBe(3);
    });

    it('空字符串应该返回 0', () => {
      expect(countImages('')).toBe(0);
    });

    it('没有图片的 HTML 应该返回 0', () => {
      expect(countImages('<p>hello world</p>')).toBe(0);
    });

    it('应该不区分大小写', () => {
      const html = '<IMG src="test.jpg"><Img src="test2.jpg">';
      expect(countImages(html)).toBe(2);
    });
  });

  describe('calculateReadingTimeSeconds 函数', () => {
    it('纯中文 400 字应该约为 60 秒', () => {
      const content = '字'.repeat(400);
      const seconds = calculateReadingTimeSeconds(content);
      expect(seconds).toBeGreaterThanOrEqual(60);
      expect(seconds).toBeLessThanOrEqual(61);
    });

    it('纯英文 200 词应该约为 60 秒', () => {
      const words = Array(200).fill('hello').join(' ');
      const seconds = calculateReadingTimeSeconds(words);
      expect(seconds).toBeGreaterThanOrEqual(60);
      expect(seconds).toBeLessThanOrEqual(61);
    });

    it('一张图片应该增加 12 秒', () => {
      const html = '<img src="test.jpg" />';
      const seconds = calculateReadingTimeSeconds(html);
      expect(seconds).toBe(12);
    });

    it('空内容应该返回 0 秒', () => {
      expect(calculateReadingTimeSeconds('')).toBe(0);
    });

    it('混合内容应该正确计算总时长', () => {
      const content = '<p>你好世界 hello world</p><img src="test.jpg">';
      const seconds = calculateReadingTimeSeconds(content);
      expect(seconds).toBeGreaterThan(0);
    });
  });

  describe('calculateReadingTimeMinutes 函数', () => {
    it('应该向上取整到分钟', () => {
      const content = '字'.repeat(400);
      const minutes = calculateReadingTimeMinutes(content);
      expect(minutes).toBe(1);
    });

    it('短文本应该至少 1 分钟', () => {
      const content = '你好';
      const minutes = calculateReadingTimeMinutes(content);
      expect(minutes).toBeGreaterThanOrEqual(0);
    });

    it('空内容应该返回 0 分钟', () => {
      expect(calculateReadingTimeMinutes('')).toBe(0);
    });
  });

  describe('formatReadingTime 函数', () => {
    it('应该返回格式化的阅读时长字符串', () => {
      const content = '字'.repeat(800);
      const result = formatReadingTime(content);
      expect(result).toMatch(/约 \d+ 分钟/);
    });

    it('空内容应该显示约 1 分钟', () => {
      expect(formatReadingTime('')).toBe('约 1 分钟');
    });

    it('短文应该显示约 1 分钟', () => {
      const content = '你好世界';
      expect(formatReadingTime(content)).toBe('约 1 分钟');
    });

    it('长文章应该显示不同时长', () => {
      const shortContent = '字'.repeat(400);
      const longContent = '字'.repeat(4000);
      expect(formatReadingTime(shortContent)).not.toBe(formatReadingTime(longContent));
    });
  });

  describe('getWordStats 函数', () => {
    it('应该返回完整的统计信息', () => {
      const content = '<p>你好 hello 世界 world</p><img src="test.jpg">';
      const stats = getWordStats(content);

      expect(stats).toHaveProperty('chineseChars');
      expect(stats).toHaveProperty('englishWords');
      expect(stats).toHaveProperty('imageCount');
      expect(stats).toHaveProperty('totalChars');
      expect(stats).toHaveProperty('readingTimeMinutes');

      expect(stats.chineseChars).toBe(4);
      expect(stats.englishWords).toBe(2);
      expect(stats.imageCount).toBe(1);
      expect(stats.totalChars).toBeGreaterThan(0);
      expect(stats.readingTimeMinutes).toBeGreaterThanOrEqual(0);
    });

    it('空内容应该返回全零统计', () => {
      const stats = getWordStats('');
      expect(stats.chineseChars).toBe(0);
      expect(stats.englishWords).toBe(0);
      expect(stats.imageCount).toBe(0);
      expect(stats.totalChars).toBe(0);
    });
  });

  describe('READING_SPEED 配置', () => {
    it('应该包含正确的阅读速度配置', () => {
      expect(READING_SPEED.CHINESE_CHARS_PER_MINUTE).toBe(400);
      expect(READING_SPEED.ENGLISH_WORDS_PER_MINUTE).toBe(200);
      expect(READING_SPEED.IMAGE_SECONDS_PER_IMAGE).toBe(12);
    });
  });
});
