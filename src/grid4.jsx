import { Box, css, Grid, Portal, Stack, Typography } from '@mui/material';
import { DataGrid, GridCellModes, GridRow, useGridApiRef } from '@mui/x-data-grid'
import React from 'react';
import { Register, useStateProperty, model, isMobile } from './model.js';

export function Grid4({ }) {

	const rows = useStateProperty(model.map(r => new RegisterRow(r)));

	const gridApi = useGridApiRef();
	const gridRef = React.useRef(null);

	const rowsRef = React.useRef(new Map());

	const ghostRef = React.useRef(null);

	const dropIndicatorEl = React.useRef(null);

	/**
	 * @param {Partial<RegisterRow>} newRow 
	 * @param {Partial<RegisterRow>} oldRow 
	 */
	function handleProcessRowUpdate2(newRow, oldRow) {
		//oldRow.name = newRow.name;
		//oldRow.bit = newRow.bit;
		//rows.set([...rows.get]);
		//return oldRow;

		const index = rows.get.findIndex(r => getRowId(r) == getRowId(oldRow));
		if (index == -1) { // по идее такое невозможно
			return oldRow;
		}

		const newRows = [...rows.get];
		//const new_r = new RegisterRow(new Register(newRow.name, undefined, newRow.bit, undefined, undefined));
		newRows[index] = new RegisterRow(new Register(newRow.name, undefined, newRow.bit, undefined, undefined));
		rows.set(newRows);
		return newRow;
	}

	function handleProcessRowUpdate(newRow, oldRow, params) {
		const index = rows.get.findIndex(r => getRowId(r) == getRowId(oldRow));
		if (index !== -1) {
			const newRows = [...rows.get];
			newRows[index] = new RegisterRow(new Register(newRow.name, newRow.type, newRow.bit, newRow.writable, newRow.description));
			//newRows[index] = newRow
			rows.set([...newRows]);
			return newRow; // {...oldRow, ...newRow, id: oldRow.id }
		}
		return oldRow;
	}

	function handleCellClick(params, e) {
		if (e.target.nodeType == 1 && !e.currentTarget.contains(e.target)) return;

		if (params.isEditable && gridApi.current.getCellMode(params.id, params.field) == GridCellModes.View) {
			gridApi.current.startCellEditMode({ id: params.id, field: params.field });
		}
	}

	function handleRowUpdateError(error) {
		// console.log('ERROR!', error);
	}

	/**
	 * @param {Partial<RegisterRow>} row
	 */
	function getRowId(row) {
		return row.id;
	}

	const dragging = React.useRef({
		draggedRow: null, // RegisterRow
		targetRow: null, // RegisterRow
		under: false,
		startFrom: (row) => {
			dragging.current.draggedRow = row;
			rowsRef.current.get(getRowId(row)).classList.add('dragged');
			ghostRef.current.textContent = `Перетаскиваю: ${row.name}`;
		},
		move: (x, y) => {
			console.log('logic move');
			ghostRef.current.style.opacity = '1';
			ghostRef.current.style.transform = `translate(${x}px, ${y}px)`;
			const row = dragging.current.targetRow;
			if (row) {
				let gridRow = rowsRef.current.get(getRowId(row));
				//gridRow.classList.add('drag_target');
				const rect = gridRow.getBoundingClientRect();
				dragging.current.under = y > rect.top + rect.height / 2;
				dropIndicatorEl.current.style.opacity = '1';
				dropIndicatorEl.current.style.top = dragging.current.under ? 'auto' : '0px';
				dropIndicatorEl.current.style.bottom = dragging.current.under ? '0px' : 'auto';
				gridRow.appendChild(dropIndicatorEl.current);
			} else {
				dropIndicatorEl.current.style.opacity = '0';
			}
		},
		enter: (row) => {
			console.log('logic enter');
			dragging.current.targetRow = row;
			rowsRef.current.get(getRowId(row)).classList.add('drag_target');
		},
		leave: (row) => {
			console.log('logic leave');
			rowsRef.current.get(getRowId(row)).classList.remove('drag_target');
			dragging.current.targetRow = null;
		},
		end: () => {
			console.log('logic end');
			rowsRef.current.get(getRowId(dragging.current.draggedRow)).classList.remove('dragged');
			dragging.current.draggedRow = null;
			ghostRef.current.style.opacity = '0';
			if (dragging.current.targetRow) {
				rowsRef.current.get(getRowId(dragging.current.targetRow)).classList.remove('drag_target');
				dragging.current.targetRow = null;
			}
		},
	});

	console.log('render');

	function moveDraggedRow() {
		if (!dragging.current.targetRow || dragging.current.targetRow == dragging.current.draggedRow) {
			return;
		}

		console.log(rows.get.some(r => r == dragging.current.draggedRow));
		console.log(rows.get.some(r => getRowId(r) == getRowId(dragging.current.draggedRow)));

		let new_rows = rows.get.filter(r => r != dragging.current.draggedRow);
		const target_idx = new_rows.indexOf(dragging.current.targetRow) + (dragging.current.under ? 1 : 0);
		new_rows = [
			...new_rows.slice(0, target_idx),
			dragging.current.draggedRow,
			...new_rows.slice(target_idx)
		];
		rows.set(new_rows);
	}

	function handleDragStart(e, row) {
		console.log('event drag start', getRowId(row));
		dragging.current.startFrom(row);
		e.dataTransfer.setDragImage(document.createElement('div'), 0, 0);
	}

	function handleTouchStart(e, row) {
		console.log('event touchStart');
		if (!e.cancelable) return; // зачем?

		dragging.current.startFrom(row);
	}

	/**
	 * @param {DragEvent} e 
	 * @param {*} row 
	 */
	function handleDragOver(e, row) {
		if (!dragging.current.draggedRow) return;

		console.log('event drag over', getRowId(row));
		if (e.relatedTarget != null) { // избавляемся от срабатывания события на дочерних элементах
			return;
		}

		if (row != dragging.current.draggedRow) {
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
		if (!dragging.current.draggedRow) return;

		console.log('event drag leave', getRowId(row));

		//if (row != dragging.current.targetRow) {
		//	dragging.current.leave(row);
		//}
		dragging.current.leave(row);
	}

	function handleDragMove(e, row) {
		if (!dragging.current.draggedRow) return;

		console.log('event drag Move');

		dragging.current.move(e.clientX, e.clientY);
	}

	/**
	 * @param {TouchEvent} e 
	 * @param {*} row 
	 */
	function handleTouchMove(e, row) {
		if (!dragging.current.draggedRow) return;

		console.log('event touchMove');

		const { clientX: x, clientY: y } = e.touches[0];

		const newTargetId = document.elementFromPoint(x, y)?.closest('.MuiDataGrid-row')?.getAttribute('data-id');
		const target_row = rows.get.find(r => getRowId(r) == newTargetId) ?? null;

		if (dragging.current.targetRow && dragging.current.targetRow != target_row) {
			dragging.current.leave(dragging.current.targetRow);
		}
		if (target_row && target_row != dragging.current.draggedRow) {
			dragging.current.enter(target_row);
		}
		dragging.current.move(x, y);
	}

	/**
	 * @param {DragEvent} e 
	 * @param {*} row 
	 */
	function handleDrop(e, row) {
		if (!dragging.current.draggedRow) return;

		console.log('event drop', getRowId(row));

		moveDraggedRow();
		dragging.current.end();
	}

	function handleDragEnd(e, row) {
		if (!dragging.current.draggedRow) return;

		console.log('event drag end');

		dragging.current.end();
	}

	/**
	 * @param {TouchEvent} e 
	 * @param {*} row 
	 */
	function handleTouchEnd(e, row) {
		if (!dragging.current.draggedRow) return;

		console.log('event touchEnd');

		moveDraggedRow();
		dragging.current.end();
	}

	// из-за этой обертки нельзя после редактирования одной ячейки сразу приступить к редактированию другой (приходится делать лишний клик для сброса фокуса)
	const DraggableGridRow = React.memo(({ row, ...props }) => {

		return (
			<GridRow ref={el => { rowsRef.current.set(getRowId(row), el); }} row={row} {...props}
				onDragOver={e => handleDragOver(e, row)}
				onDragLeave={e => handleDragLeave(e, row)}
				onDrop={e => handleDrop(e, row)}
			/>
		);
	});
	DraggableGridRow.displayName = 'DraggableGridRow';

	const state = useStateProperty(false);

	React.useEffect(() => {
		const handleResize = () => state.set(!state.get);
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		}
	});

	return (/*<Grid onDragLeave={e => ghostRef.current.style.opacity = '0' }>*/<Stack>
		<Typography>4</Typography>
		<DataGrid
			ref={gridRef}
			apiRef={gridApi}
			rows={rows.get}
			getRowId={getRowId}
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
							<Box draggable={true}
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
								onDragStart={isMobile() ? undefined : e => handleDragStart(e, params.row)}
								onTouchStart={isMobile() ? e => handleTouchStart(e, params.row) : undefined}
								onDrag={isMobile() ? undefined : e => handleDragMove(e, params.row)}
								onTouchMove={isMobile() ? e => handleTouchMove(e, params.row) : undefined}
								onDragEnd={isMobile() ? undefined : e => handleDragEnd(e, params.row)}
								onTouchEnd={isMobile() ? e => handleTouchEnd(e, params.row) : undefined}
								onContextMenu={e => e.preventDefault()}
							>
								<Box sx={{ width: 3, height: 10, bgcolor: 'grey.600', borderRadius: 1 }} />
								<Box sx={{ width: 3, height: 10, bgcolor: 'grey.600', borderRadius: 1 }} />
								<Box sx={{ width: 3, height: 10, bgcolor: 'grey.600', borderRadius: 1 }} />
							</Box>
						</Box>
					)
				},
				{ field: 'name', headerName: 'Название', editable: true, sortable: false, flex: 1, valueGetter: (value) => value ?? '' },
				{ field: 'bit', headerName: 'bit', editable: true, type: 'singleSelect', valueOptions: [1, 2, 3, 4, 5], sortable: false, flex: 1 },
			]}
		/>
		<Portal container={document.body}>
			<Box ref={ghostRef}
				sx={css`
					position: fixed;
					left: 0;
					top: 0;
					opacity: 0;
					width: 220px;
					height: 60px;
					border-radius: 12px;
					background: linear-gradient(135deg, #1976d2, #42a5f5);
					box-shadow: 0 10px 30px rgba(25,118,210,0.4);
					display: flex;
					align-items: center;
					padding: 0 16px;
					color: white;
					font-weight: 600;
					font-size: 14px;
					backdrop-filter: blur(10px);
					pointer-events: none;
				`}
			></Box>
			<Box ref={dropIndicatorEl}
				sx={css`
					position: absolute;
					opacity: 0;
					height: 4px; 
					background: linear-gradient(90deg, #2196f3, #42a5f5);
					box-shadow: 0 2px 8px rgba(33,150,243,0.4);
					z-index: 999;
					pointer-events: none;
					left: 0;
					top: 0;
					display: block;
					width: 100%;
				`}
			></Box>
		</Portal>
	</Stack>/*</Grid>*/);
}

class RegisterRow {

	constructor(register) {
		this.name = register.name;
		this.bit = register.bit;
		this.id = register.name;
	}

	//drag = false; // не используется!

}

const ResponsibleDataGrid = css`
  overscroll-behavior-y: none;
  
  & .MuiDataGrid-row {
  	position: relative;
	transition: background 1s ease;
	min-height: 56px !important;
	touch-action: manipulation !important;
	//box-sizing: border-box;

	&.dragged {
		opacity: 0.5;
	}
	
	&.drag_target {
		// border-top: 3px solid #2196f3;
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