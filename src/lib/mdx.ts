import { compileMDX } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import Link from 'next/link';
import { createElement } from 'react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Collapsible from '@/components/Collapsible';
import Figure from '@/components/Figure';
import { resolvePostAssetPath } from '@/lib/paths';
import { FIGURE_DIMENSIONS } from '@/lib/site-config';

function createMDXComponents(slug: string) {
  return {
    img: (props: React.ComponentProps<'img'>) => {
      const src = resolvePostAssetPath(typeof props.src === 'string' ? props.src : '', slug);
      return createElement(Image, {
        src,
        alt: props.alt || '',
        width: FIGURE_DIMENSIONS.width,
        height: FIGURE_DIMENSIONS.height,
        className: 'rounded-md w-full h-auto',
        sizes: '(max-width: 768px) 100vw, 768px',
      });
    },
    a: (props: React.ComponentProps<'a'>) => {
      const href = props.href || '';
      const isExternal = href.startsWith('http');
      if (isExternal) {
        return createElement(
          'a',
          {
            href,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: props.className,
          },
          props.children
        );
      }
      return createElement(Link, { href, className: props.className }, props.children);
    },
    Collapsible,
    Figure: (props: { src: string; caption: string; alt?: string; number?: number }) => {
      const src = resolvePostAssetPath(props.src, slug);
      return createElement(Figure, { ...props, src });
    },
  };
}

export async function renderMDX(source: string, slug: string) {
  const { content, frontmatter } = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
      },
    },
    components: createMDXComponents(slug),
  });

  return { content, frontmatter };
}
