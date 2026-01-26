import { Box, css, Portal } from '@mui/material';
import { DataGrid, GridCellModes, GridRow, useGridApiRef } from '@mui/x-data-grid'
import React from 'react';
import { Register, useStateProperty, model } from './model.js';

export function Grid3({ }) {

	const rows = useStateProperty(model.map(r => new RegisterRow(r)));

	const gridApi = useGridApiRef();
	const gridRef = React.useRef(null);

	const ghost = document.createElement('div');
	ghost.style.opacity = 0;
	ghost.style.width = 0;
	ghost.style.height = 0;

	/**
	 * @param {RegisterRow} newRow 
	 * @param {RegisterRow} oldRow 
	 */
	function handleProcessRowUpdate(newRow, oldRow) {
		const index = rows.get.findIndex(row => row.id == oldRow.id);
		if (index !== -1) {
			const newRows = [...rows.get];
			newRows[index] = new RegisterRow(new Register(newRow.name, newRow.type, newRow.bit, newRow.writable, newRow.description));
			rows.set(newRows);
			return newRow;
		}
		return oldRow;
	}

	function handleCellClick(params, event) {
		if (event.target.nodeType == 1 && !event.currentTarget.contains(event.target)) return;

		if (params.isEditable && gridApi.current.getCellMode(params.id, params.field) == GridCellModes.View) {
			gridApi.current.startCellEditMode({ id: params.id, field: params.field });
		}
	}

	function handleRowUpdateError(error) {
		// console.log('ERROR!', error);
	}

	const rowsRef = React.useRef(new Map());

	const ghostRef = React.useRef(null);

	const dragging = React.useRef({
		draggedRow: null, // RegisterRow
		targetRow: null, // RegisterRow
		startFrom: (row) => {
			dragging.current.draggedRow = row;
			rowsRef.current.get(row.id).classList.add('dragged');
		},
		enter: (row) => {
			dragging.current.targetRow = row;
			rowsRef.current.get(row.id).classList.add('drag_target');
		},
		leave: (row) => {
			rowsRef.current.get(row.id).classList.remove('drag_target');
			dragging.current.targetRow = null;
		},
		end: () => {
			rowsRef.current.get(dragging.current.draggedRow.id).classList.remove('dragged');
			dragging.current.draggedRow = null;
			if (dragging.current.targetRow) {
				rowsRef.current.get(dragging.current.targetRow.id).classList.remove('drag_target');
				dragging.current.targetRow = null;
			}
		},
	});

	function handleDragStart(e, row) {
		console.log('drag start', row.id);

		dragging.current.startFrom(row);
		ghostRef.current.textContent = `Перетаскиваю: ${dragging.current.draggedRow.name}`;

		e.dataTransfer.setDragImage(ghost, 0, 0);
	}

	/**
	 * @param {DragEvent} e 
	 * @param {*} row 
	 */
	function handleDragOver(e, row) {
		console.log('drag over', row.id);

		ghostRef.current.style.display = 'flex';

		ghostRef.current.style.left = `${e.clientX}px`;
		ghostRef.current.style.top = `${e.clientY}px`;

		const next_row = rows.get[rows.get.indexOf(dragging.current.draggedRow) + 1];
		if (row != dragging.current.draggedRow && row != next_row) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'move';
			dragging.current.enter(row);
		}
	}

	/**
	 * @param {DragEvent} e 
	 * @param {*} row 
	 */
	function handleDragLeave(e, row) {
		console.log('drag leave', row.id);
		dragging.current.leave(row);
	}

	/**
	 * @param {DragEvent} e 
	 * @param {*} row 
	 */
	function handleDrop(e, row) {
		console.log('drop', row.id);
		let new_rows = rows.get.filter(r => r != dragging.current.draggedRow);
		const target_idx = new_rows.indexOf(dragging.current.targetRow);
		new_rows = [
			...new_rows.slice(0, target_idx),
			dragging.current.draggedRow,
			...new_rows.slice(target_idx)
		];
		rows.set(new_rows);
		dragging.current.end();
		ghostRef.current.style.display = 'none';
	}

	function handleDragEnd(e, row) {
		console.warn(row)
		dragging.current.end();
	}

	const DraggableGridRow = React.memo(({ row, ...props }) => {

		return (
			<GridRow ref={el => { rowsRef.current.set(row.id, el); }} row={row} {...props}
				onDragOver={e => handleDragOver(e, row)}
				onDragLeave={e => handleDragLeave(e, row)}
				onDrop={e => handleDrop(e, row)}
			/>
		);
	});
	DraggableGridRow.displayName = 'DraggableGridRow';

	const prevRow = React.useRef(null);

	function handleTouchStart(e, row) {
		console.log('touchStart');
		if (!e.cancelable) return;

		dragging.current.startFrom(row);
		ghostRef.current.textContent = `Перетаскиваю: ${dragging.current.draggedRow.name}`;

	}

	function handleTouchMove(e) {
		console.log('touchMove');
		if (!dragging.current.draggedRow || !ghostRef.current) return;
		const touch = e.touches[0];

		ghostRef.current.style.display = 'flex';
		ghostRef.current.style.left = `${touch.clientX}px`;
		ghostRef.current.style.top = `${touch.clientY}px`;

		const element = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.MuiDataGrid-row');
		const newTargetId = element?.getAttribute('data-id');
		const row = rows.get.find(target => target.name == newTargetId);

		if (!row) {
			ghostRef.current.style.display = 'none';
		};

		if (prevRow.current && prevRow.current != row) {
			dragging.current.leave(prevRow.current);
		}
		prevRow.current = row;

		const next_row = rows.get[rows.get.indexOf(dragging.current.draggedRow) + 1];
		if (row != dragging.current.draggedRow && row != next_row) {
			dragging.current.enter(row);
		}
	}

	/**
	 * @param {TouchEvent} e 
	 * @param {*} row 
	 */
	function handleTouchEnd(e, row) {
		console.log('touchEnd');
		if (!dragging.current.draggedRow) return;
		let new_rows = rows.get.filter(r => r != dragging.current.draggedRow);
		const target_idx = new_rows.indexOf(dragging.current.targetRow);
		new_rows = [
			...new_rows.slice(0, target_idx),
			dragging.current.draggedRow,
			...new_rows.slice(target_idx)
		];
		rows.set(new_rows);
		dragging.current.end();
		ghostRef.current.style.display = 'none';
	}

	return (<Box sx={{ width: '100%', height: '100%' }} onDragLeave={e => { dragging.current.leave(dragging.current.draggedRow); ghostRef.current.style.display = 'none'; }}>
		<DataGrid
			ref={gridRef}
			apiRef={gridApi}
			rows={rows.get}
			sx={ResponsibleDataGrid}
			editMode="cell"
			disableColumnMenu={true}
			hideFooterSelectedRowCount={true}
			disableRowSelectionOnClick={true}
			showCellVerticalBorder={true}
			showColumnVerticalBorder={true}
			showToolbar={true}
			hideFooter={true}
			onCellClick={handleCellClick}
			processRowUpdate={handleProcessRowUpdate}
			onProcessRowUpdateError={handleRowUpdateError}
			slots={{
				row: DraggableGridRow
			}}
			columns={[
				{
					field: 'drag', headerName: 'drag', editable: false, sortable: false,
					renderCell: (params) => (
						<Box sx={{
							width: '100%',
							height: '100%',
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							touchAction: 'none !important',
							userSelect: 'none',
							WebkitUserSelect: 'none'
						}}>
							<Box
								draggable={true}
								sx={{
									height: '36px',
									width: '36px',
									background: 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)',
									borderRadius: '6px',
									cursor: 'grab',
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
									gap: '2px',
									boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
									transition: 'all 0.2s ease',
									'&:active': {
										transform: 'scale(0.95)',
										background: '#d0d0d0'
									}
								}}
								onDragStart={e => handleDragStart(e, params.row)}
								onTouchStart={e => handleTouchStart(e, params.row)}
								onTouchMove={handleTouchMove}
								onTouchEnd={handleTouchEnd}
								onDragEnd={e => handleDragEnd(e, params.row)}
							>
								<Box sx={{ width: 3, height: 10, bgcolor: 'grey.600', borderRadius: 1 }} />
								<Box sx={{ width: 3, height: 10, bgcolor: 'grey.600', borderRadius: 1 }} />
								<Box sx={{ width: 3, height: 10, bgcolor: 'grey.600', borderRadius: 1 }} />
							</Box>
						</Box>
					)
				},
				{ field: 'name', headerName: 'Название', editable: true, sortable: false, flex: 1, valueGetter: (value) => value ?? '' },
			]}
		/>
		<Portal container={document.body}>
			<Box ref={ghostRef}
				sx={css`
					position: fixed;
					opacity: 1;
					width: 220px;
					height: 60px;
					border-radius: 12px;
					background: linear-gradient(135deg, #1976d2, #42a5f5);
					box-shadow: 0 10px 30px rgba(25,118,210,0.4);
					display: none;
					align-items: center;
					padding: 0 16px;
					color: white;
					font-weight: 600;
					font-size: 14px;
					backdrop-filter: blur(10px);
					pointer-events: none;
				`}
			></Box>
		</Portal>
	</Box>);
}

class RegisterRow {

	constructor(register) {
		this.name = register.name;
	}

	//drag = false; // не используется!

	get id() {
		return this.name;
	}

}

const ResponsibleDataGrid = css`
  overscroll-behavior-y: none;
  
  & .MuiDataGrid-row {
	transition: background 1s ease;
	min-height: 56px !important;
	touch-action: manipulation !important;
	//box-sizing: border-box;

	&.dragged {
		opacity: 0.5;
	}
	
	&.drag_target {
		border-top: 3px solid #2196f3;
		background: #2196f340;
	}
  }
  
  @media(max-width: 768px) {
	.toolBar > * { 
	  display: flex; 
	  flex-direction: column; 
	}
	.MuiDataGrid-row { 
	  min-height: 64px !important; 
	}
  }
  
  & .duplicate-warning {
	background: linear-gradient(90deg, #fff3cd 0%, #ffeaa7 100%) !important;
	box-shadow: inset 0 0 0 2px #ffc107;
  }
`;
