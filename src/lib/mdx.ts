import { compileMDX } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import Link from 'next/link';
import { createElement } from 'react';

function createMDXComponents(slug: string) {
  return {
    img: (props: React.ComponentProps<'img'>) => {
      let src = typeof props.src === 'string' ? props.src : '';
      // Transform relative paths to public paths
      if (src.startsWith('./')) {
        src = `/posts/${slug}/${src.slice(2)}`;
      }
      return createElement(Image, {
        src,
        alt: props.alt || '',
        width: 800,
        height: 450,
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
  };
}

export async function renderMDX(source: string, slug: string) {
  const { content, frontmatter } = await compileMDX({
    source,
    options: { parseFrontmatter: true },
    components: createMDXComponents(slug),
  });

  return { content, frontmatter };
}
