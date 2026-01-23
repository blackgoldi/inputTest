import { Box, ButtonGroup, Button, css, Stack } from '@mui/material';
import React from 'react';
import { Grid } from './grid.jsx';
import { Grid2 } from './grid2.jsx';
import { Grid3 } from './grid3.jsx';

function App() {

	return (
		<Stack direction="row" spacing={1}>
			<Grid/>
			<Grid2/>
			<Grid3/>
		</Stack>
	)

}

export default App;
