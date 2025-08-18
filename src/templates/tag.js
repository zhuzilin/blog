import React from "react"
import PropTypes from "prop-types"

// Components
import { Link, graphql } from "gatsby"
import Layout from "../components/layout"
import '../styles/tag.css';

const Tags = ({ pageContext, data }) => {
  const { tag } = pageContext
  const { edges, totalCount } = data.allMarkdownRemark
  const tagHeader = `${totalCount} post${
    totalCount === 1 ? "" : "s"
  } tagged with "${tag}"`

  return (
    <Layout>
        <div>
        <p>{tagHeader}</p>
            {edges.map(({ node }, i) => {
            const { slug } = node.fields
            const { title } = node.frontmatter
            return (
                <h2 key={slug}>
                  <Link to={slug}>
                    {`${i+1}. ${title}`}
                  </Link>
                </h2>
            )
            })}
        {/*
                This links to a page that does not yet exist.
                We'll come back to it!
                */}
        <Link to="/tags">All tags</Link>
        </div>
    </Layout>
  )
}

Tags.propTypes = {
  pageContext: PropTypes.shape({
    tag: PropTypes.string.isRequired,
  }),
  data: PropTypes.shape({
    allMarkdownRemark: PropTypes.shape({
      totalCount: PropTypes.number.isRequired,
      edges: PropTypes.arrayOf(
        PropTypes.shape({
          node: PropTypes.shape({
            frontmatter: PropTypes.shape({
              title: PropTypes.string.isRequired,
            }),
            fields: PropTypes.shape({
              slug: PropTypes.string.isRequired,
            }),
          }),
        }).isRequired
      ),
    }),
  }),
}

export default Tags

export const pageQuery = graphql`
  query($tag: String) {
    allMarkdownRemark(
      limit: 2000
      sort: { frontmatter: { date: DESC } }
      filter: { frontmatter: { tags: { in: [$tag] } } }
    ) {
      totalCount
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            title
          }
        }
      }
    }
  }
`