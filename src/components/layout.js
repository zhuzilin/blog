import React from "react"
import { css } from "@emotion/react"
import { useStaticQuery, Link, graphql } from "gatsby"
import { Helmet } from "react-helmet"
import { rhythm } from "../utils/typography"

export default ({ children }) => {
  const data = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            title
          }
        }
      }
    `
  )
  
  return (
    <div css={css`
        margin: 0 auto;
        max-width: 900px;
        padding: ${rhythm(2)};
        padding-top: ${rhythm(1.5)};`}>
      <Helmet>
        <meta charSet="utf-8" />
        <title>zhuzilin's Blog</title>
      </Helmet>
      <Link to={`/`}>
        <h3 css={css`
            margin-bottom: ${rhythm(2)};
            display: inline-block;
            font-style: normal;`}>
          {data.site.siteMetadata.title}
        </h3>
      </Link>
      <Link to={`/about/`} css={css`float: right`}>
        <h4 css={css`
            margin-bottom: ${rhythm(2)};
            display: inline-block;
            font-style: normal;
            color: #9f392b`}>
          about
        </h4>
      </Link>
      {children}
    </div>
  )
}