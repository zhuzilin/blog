const path = require(`path`)
const { createFilePath } = require(`gatsby-source-filesystem`)
const _ = require(`lodash`);

exports.onCreateNode = ({ node, getNode, actions }) => {
    const { createNodeField } = actions
    if (node.internal.type === `MarkdownRemark`) {
        const slug = createFilePath({ node, getNode, basePath: `pages` })
        createNodeField({
            node,
            name: `slug`,
            value: slug,
        })
    }
}

exports.createPages = ({ graphql, actions }) => {
    const { createPage } = actions
    return graphql(`
    {
      allMarkdownRemark(
        filter: { frontmatter: { draft: { ne: true } } }
        sort: { frontmatter: { date: DESC } }
        limit: 2000
      ) {
        edges {
          node {
            fields {
              slug
            }
            frontmatter {
              tags
              draft
            }
          }
        }
      }
    }
  `
    ).then(result => {
        const posts = result.data.allMarkdownRemark.edges;
        posts.forEach(({ node }) => {
            createPage({
                path: node.fields.slug,
                component: path.resolve(`./src/templates/blog-post.js`),
                context: {
                    // Data passed to context is available
                    // in page queries as GraphQL variables.
                    slug: node.fields.slug,
                },
            })
        });
        
        let tags = []
        // Iterate through each post, putting all found tags into `tags`
        _.each(posts, edge => {
          if (_.get(edge, "node.frontmatter.tags")) {
            tags = tags.concat(edge.node.frontmatter.tags)
          }
        })
        // Eliminate duplicate tags
        tags = _.uniq(tags)
        // Make tag pages
        tags.forEach(tag => {
          createPage({
            path: `/tags/${_.kebabCase(tag)}/`,
            component: path.resolve(`./src/templates/tag.js`),
            context: {
              tag,
            },
          })
        })
    })
}