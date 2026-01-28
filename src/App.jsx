import { Box, ButtonGroup, Button, css, Stack, Grid } from '@mui/material';
import React from 'react';
import { Grid1 } from './grid1.jsx';
import { Grid2 } from './grid2.jsx';
import { Grid3 } from './grid3.jsx';
import { Grid4 } from './grid4.jsx';

function App() {

	return (
		<Grid container={true} columns={4} spacing={1}>
			{/*<Grid5/>*/}
			{/*<Grid6/>*/}
			{/*<Grid2/>*/}
			<Grid size="auto">
				<Grid3 />
			</Grid>
			<Grid size={2}>
				<Grid3 />
			</Grid>
			<Grid size="grow">
				<Grid4 />
			</Grid>
		</Grid>
	);

}

export default App;
