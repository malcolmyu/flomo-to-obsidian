import { parse, HTMLElement } from 'node-html-parser';
import { HIGHLIGHT_PLACEHOLDER, FILES_DIR_PLACEHOLDER } from './const';
//import { NodeHtmlMarkdown} from 'node-html-markdown';
import turndown, { TagName } from 'turndown';

export class FlomoCore {
  memos: Record<string, string>[];
  tags: string[];
  files: Record<string, string[]>;

  constructor(flomoData: string) {
    //const root = parse(DOMPurify.sanitize(flomoData));
    const root = parse(flomoData);
    this.memos = this.loadMemos(root.querySelectorAll('.memo'));
    this.tags = this.loadTags(root.getElementById('tag')!.querySelectorAll('option'));
    this.files = {};
  }

  private loadMemos(memoNodes: Array<HTMLElement>): Record<string, string>[] {
    const res: Record<string, string>[] = [];
    const extractTitle = (item: string) => {
      return item.replace(/(-|:|\s)/gi, '_');
    };
    const extractContent = (content: string) => {
      //return NodeHtmlMarkdown.translate(content, {bulletMarker: '-',}).replace('\[', '[').replace('\]', ']')
      //return NodeHtmlMarkdown.translate(content, {bulletMarker: '-',}).replace('\[', '[').replace('\]', ']')
      //return (new showdown.Converter({metadata: false})).makeMarkdown(content)
      //return NodeHtmlMarkdown.translate(content, {bulletMarker: '-'})
      const td = new turndown({ bulletListMarker: '-' });
      //const p_rule = {
      //    filter: 'p',
      //    replacement: function (content) {
      //      return '\n' + content + '\n'
      //    }
      //  }
      const liRule = {
        filter: 'li' as TagName,

        replacement: function (content: string, node: any, options: any) {
          content = content
            .replace(/^\n+/, '') // remove leading newlines
            .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
            .replace(/\n/gm, '\n    '); // indent
          //.replace(/\<p\>/gi, '')
          //.replace(/\<\/p\>/gi, '')
          let prefix = options.bulletListMarker + ' ';
          const parent = node.parentNode;
          if (parent.nodeName === 'OL') {
            const start = parent.getAttribute('start');
            const index = Array.prototype.indexOf.call(parent.children, node);
            prefix = (start ? Number(start) + index : index + 1) + '.  ';
          }
          return prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '');
        }
      };

      td.addRule('listItem', liRule);

      // 使用 turndown 自定义规则，直接在生成阶段处理 img/a 的 URL
      // - 将备份中的 file/ 前缀标准化为占位符 FILES_DIR_PLACEHOLDER
      // - 对可能包含空格的路径使用角括号包裹，避免 Markdown 解析问题
      td.addRule('imageAngleWrap', {
        filter: 'img',
        replacement: (content, node: any) => {
          const alt = (node.getAttribute?.('alt') ?? '') as string;
          let src = (node.getAttribute?.('src') ?? '') as string;
          if (!src) return '';
          if (src.startsWith('file/')) {
            src = `${FILES_DIR_PLACEHOLDER}${src.substring('file/'.length)}`;
          }
          const url = src.startsWith(FILES_DIR_PLACEHOLDER) || src.startsWith('file/') ? `<${src}>` : src;
          return `![${alt}](${url})`;
        }
      });

      const md = td
        .turndown(content)
        .replace(/\\\[/g, '[')
        .replace(/\\\]/g, ']')
        //replace(/\\#/g, '#')
        // Normalize flomo backup image links: (file/...) → (FILES_DIR_PLACEHOLDER...)
        // Use a broad pattern to keep alt text intact
        .replace(/\]\(file\//gi, `](${FILES_DIR_PLACEHOLDER}`);

      return md;
      //.replace(/\<\!--\s--\>/g, '')
      //.replace(/^\s*[\r\n]/gm,'')
      //.replace(/!\[null\]\(<file\//gi, "\n![](<flomo/");
    };

    memoNodes.forEach((i) => {
      const dateTime = i.querySelector('.time')!.textContent;
      const title = extractTitle(dateTime);

      // @Mar-31, 2024 Fix: #20 - Support <mark>.*?<mark/>
      const contentBody = i
        .querySelector('.content')!
        .innerHTML.replaceAll('<mark>', HIGHLIGHT_PLACEHOLDER)
        .replaceAll('</mark>', HIGHLIGHT_PLACEHOLDER);
      const contentFile = i.querySelector('.files')!.innerHTML;

      const content = extractContent(contentBody) + '\n' + extractContent(contentFile);

      res.push({
        title: title,
        date: dateTime.split(' ')[0],
        content:
          '📅 [[' + dateTime.split(' ')[0] + ']]' + ' ' + dateTime.split(' ')[1] + '\n\n' + content
      });
    });

    return res;
  }

  private loadTags(tagNodes: Array<HTMLElement>): string[] {
    const res: string[] = [];

    tagNodes.slice(1).forEach((i) => {
      res.push(i.textContent);
    });

    return res;
  }
}
