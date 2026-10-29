import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { TableCell, TableRow } from '../table'

interface SkeletonLoaderProps {
  columns: ColumnDef<any, any>[]
  rowCount?: number
  widthClasses: string[] // Add this prop
}

export default function SkeletonLoader({ 
  columns, 
  rowCount = 5, 
  widthClasses = [] 
}: SkeletonLoaderProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`}>
          {columns.map((column, colIndex) => {
            const widthClass = widthClasses[colIndex] || column.meta?.widthClass || '';
            
            return (
              <TableCell
                key={`skeleton-${rowIndex}-${colIndex}`}
                className={`px-3 py-2.5 text-start ${widthClass}`}
              >
                <div 
                  className={`h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse ${widthClass}`}
                ></div>
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  )
}