import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    transition: all 0.25s linear;
  }
  
  * {
    box-sizing: border-box;
  }

  h1, h2, h3, h4, h5, h6 {
    color: ${({ theme }) => theme.headerText};
  }

  p, span, div {
    color: ${({ theme }) => theme.text};
  }
`;

export default GlobalStyle;
