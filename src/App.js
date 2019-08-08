import { gql } from "apollo-boost";
import { ApolloProvider, Query, Mutation } from "react-apollo";
import OneGraphApolloClient from "onegraph-apollo-client";
import OneGraphAuth from "onegraph-auth";

import React, { Component } from "react";

import "./App.css";

var textMessage;

const APP_ID = "63a50819-5b53-40e8-b645-e627c781cadc";

const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($message: String, $receiver_number: String) {
    twilio(
      auths: {
        twilioAuth: {
          authToken: "52d03f02bf55fb4837a8e23aac104f4d"
          accountSid: "AC7c7eee8f364f451fbaf1955432ec038b"
        }
      }
    ) {
      sendMessage(
        data: { from: "+13237651939", to: $receiver_number, body: $message }
      )
    }
  }
`;

const SendMessageMutation = ({ message, receiverNumber }) => {
  return (
    <Mutation mutation={SEND_MESSAGE_MUTATION}>
      {(SendMessage, { loading, error, data }) => {
        if (loading) return <pre>Loading</pre>;

        if (error)
          return (
            <pre>
              Failed at {new Date().toString()}
              Error in SEND_MESSAGE_MUTATION
              {JSON.stringify(error, null, 2)}
            </pre>
          );

        const dataEl = data ? (
          <p>Successfully sent data at {new Date().toString()} </p>
        ) : null;

        return (
          <div>
            {dataEl}

            <button
              onClick={() =>
                SendMessage({
                  variables: {
                    message: message,
                    receiver_number: receiverNumber
                  }
                })
              }
            >
              SendMessage
            </button>
          </div>
        );
      }}
    </Mutation>
  );
};

const GIT_HUB_CONTRIBUTIONS_QUERY = gql`
  query GitHubContributions($from: DateTime!) {
    gitHub {
      viewer {
        contributionsCollection(from: $from) {
          pullRequestContributionsByRepository {
            repository {
              nameWithOwner
            }
            contributions(first: 10, orderBy: { direction: DESC }) {
              nodes {
                pullRequest {
                  title
                  state
                  commits(first: 10) {
                    nodes {
                      id
                      commit {
                        message
                      }
                    }
                  }
                }
                occurredAt
              }
            }
          }
          pullRequestReviewContributionsByRepository {
            repository {
              nameWithOwner
            }
            contributions(first: 10, orderBy: { direction: DESC }) {
              nodes {
                pullRequestReview {
                  createdAt
                  bodyText
                }
              }
            }
          }
          totalCommitContributions
          commitContributionsByRepository {
            repository {
              nameWithOwner
            }
          }
        }
      }
    }
  }
`;

const GitHubContributionsQuery = props => {
  return (
    <Query query={GIT_HUB_CONTRIBUTIONS_QUERY} variables={{ from: props.from }}>
      {({ loading, error, data }) => {
        if (loading) return <pre>Loading</pre>;
        if (error)
          return (
            <pre>
              Error in GIT_HUB_CONTRIBUTIONS_QUERY
              {JSON.stringify(error, null, 2)}
            </pre>
          );

        if (data) {
          console.log(data.gitHub.viewer.contributionsCollection);
          const prRepos =
            data.gitHub.viewer.contributionsCollection
              .pullRequestContributionsByRepository;
          const reviews =
            data.gitHub.viewer.contributionsCollection
              .pullRequestReviewContributionsByRepository;
          const commitsRepo =
            data.gitHub.viewer.contributionsCollection
              .commitContributionsByRepository;

          const totalCommitNum =
            data.gitHub.viewer.contributionsCollection.totalCommitContributions;

          const commitedRepos = commitsRepo.map(
            repo => repo.repository.nameWithOwner
          );

          const getPrCommits = nodes => {
            return `where you did ${nodes.map(commit => {
              return `${commit.commit.message}
            `;
            })}`;
          };
          const getPrs = nodes => {
            return `${nodes.map(pr => {
              return `${pr.pullRequest.title}
            `;
            })}`;
            //${getPrCommits(pr.pullRequest.commits.nodes)}
          };
          const prMessage = prRepos
            .map(repo => {
              return `
          At ${repo.repository.nameWithOwner}, you worked on:
            ${getPrs(repo.contributions.nodes)}
              `;
            })
            .join();

          const cleanMessage =
            `Wow! You did some amazing work today! You did ${totalCommitNum} commits in total at: ${commitedRepos.join(
              ", "
            )}
            ` + prMessage.replace(/,/g, "");
          textMessage = cleanMessage;
          //props.updateMessage(cleanMessage);
          console.log(cleanMessage);

          return (
            <div className="works">
              <h2>Here are some amazing jobs you have done!</h2>
              <p>
                You did {totalCommitNum} commits in total at{" "}
                {commitedRepos.join(", ")}
              </p>
              {prRepos.map(repo => {
                return (
                  <div>
                    Here are the amazing work you have done for{" "}
                    {repo.repository.nameWithOwner}:
                    {repo.contributions.nodes.map(pr => {
                      return (
                        <ul>
                          <li>
                            {pr.pullRequest.title}
                            <ul>
                              {pr.pullRequest.commits.nodes.map(commit => {
                                return <li>{commit.commit.message}</li>;
                              })}
                            </ul>
                          </li>
                        </ul>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        }
      }}
    </Query>
  );
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoggedIn: false,
      phoneNumber: null,
      txtMessage: null
    };

    this._oneGraphAuth = new OneGraphAuth({
      appId: APP_ID
    });
    this._oneGraphClient = new OneGraphApolloClient({
      oneGraphAuth: this._oneGraphAuth
    });
  }

  _authWithGithub = async () => {
    await this._oneGraphAuth.login("github");
    const isLoggedIn = await this._oneGraphAuth.isLoggedIn("github");
    this.setState(state => {
      return { ...state, isLoggedIn: isLoggedIn };
    });
  };

  componentDidMount() {
    this._oneGraphAuth.isLoggedIn("github").then(isLoggedIn =>
      this.setState(state => {
        return { ...state, isLoggedIn };
      })
    );
  }

  updatePhoneNumber(number) {
    this.setState(state => {
      return { ...state, phoneNumber: number };
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.state === nextState) {
      return false;
    }
    return true;
  }

  updateMessage(message) {
    this.setState(state => {
      return { ...state, txtMessage: message };
    });
  }

  render() {
    const yesterday =
      new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split(".")[0] +
      "Z";
    return (
      <div>
        <h1>WonderfulDay</h1>
        <div className="wrapper">
          <input
            placeholder="Phone Number"
            onChange={e => this.updatePhoneNumber(e.target.value)}
          />
          <ApolloProvider client={this._oneGraphClient}>
            <SendMessageMutation
              message={textMessage}
              receiverNumber={this.state.phoneNumber}
            />
            <GitHubContributionsQuery
              from={yesterday}
              updateMessage={message => this.updateMessage(message)}
            />
          </ApolloProvider>

          <p className="App-intro">
            {this.state.isLoggedIn ? (
              <div>
                <small>You are logged in with Github</small>
              </div>
            ) : (
              <button className="github-btn" onClick={this._authWithGithub}>
                Login with Github
              </button>
            )}
          </p>
        </div>
      </div>
    );
  }
}

export default App;
