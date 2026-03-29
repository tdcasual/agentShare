'use client';

import { useState } from 'react';
import { Layout } from '../../interfaces/human/layout';
import { Card } from '../../shared/ui-primitives/card';
import { Button } from '../../shared/ui-primitives/button';
import { Badge } from '../../shared/ui-primitives/badge';
import { Modal } from '../../shared/ui-primitives/modal';
import { 
  Plus, Search, Filter, CheckCircle2, Circle, Clock, 
  AlertCircle, ArrowRight, User, Bot, MoreHorizontal
} from 'lucide-react';

export default function TasksPage() {
  return (
    <Layout>
      <TasksContent />
    </Layout>
  );
}

const mockTasks = [
  { 
    id: 1, 
    title: 'Deploy API v2.0', 
    description: 'Deploy the new API version to production with zero downtime',
    status: 'in_progress',
    priority: 'high',
    assignee: { name: 'DeployBot', type: 'agent', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DeployBot' },
    creator: { name: 'Alice', type: 'human' },
    dueDate: 'Today',
    tags: ['deployment', 'api'],
  },
  { 
    id: 2, 
    title: 'Review Security Config', 
    description: 'Audit and update security configurations for all services',
    status: 'pending',
    priority: 'critical',
    assignee: null,
    creator: { name: 'SecurityBot', type: 'agent' },
    dueDate: 'Tomorrow',
    tags: ['security', 'audit'],
  },
  { 
    id: 3, 
    title: 'Analyze User Data', 
    description: 'Generate weekly analytics report from user activity data',
    status: 'completed',
    priority: 'medium',
    assignee: { name: 'DataAnalyzer', type: 'agent', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DataAnalyzer' },
    creator: { name: 'Alice', type: 'human' },
    dueDate: 'Yesterday',
    tags: ['analytics', 'reporting'],
  },
  { 
    id: 4, 
    title: 'Update Documentation', 
    description: 'Update API documentation with new endpoints',
    status: 'claimed',
    priority: 'low',
    assignee: { name: 'Alice', type: 'human', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
    creator: { name: 'DeployBot', type: 'agent' },
    dueDate: 'Next week',
    tags: ['docs'],
  },
];

const columns = [
  { id: 'published', title: 'Published', color: 'gray' },
  { id: 'claimed', title: 'Claimed', color: 'blue' },
  { id: 'in_progress', title: 'In Progress', color: 'yellow' },
  { id: 'completed', title: 'Completed', color: 'green' },
];

function TasksContent() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Tasks</h1>
          <p className="text-gray-600 mt-1">
            Manage and track tasks across the system
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-3xl font-bold text-gray-400">3</p>
          <p className="text-sm text-gray-500">Published</p>
        </Card>
        <Card className="p-4">
          <p className="text-3xl font-bold text-blue-500">2</p>
          <p className="text-sm text-gray-500">Claimed</p>
        </Card>
        <Card className="p-4">
          <p className="text-3xl font-bold text-yellow-500">1</p>
          <p className="text-sm text-gray-500">In Progress</p>
        </Card>
        <Card className="p-4">
          <p className="text-3xl font-bold text-green-500">1</p>
          <p className="text-sm text-gray-500">Completed</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-11 pr-4 py-2 rounded-full bg-white border border-pink-200 text-sm focus:ring-2 focus:ring-pink-200 outline-none"
          />
        </div>
        <Button variant="secondary">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnTasks = mockTasks.filter(t => t.status === column.id);
          
          return (
            <div key={column.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">{column.title}</h3>
                <span className="text-sm text-gray-400">{columnTasks.length}</span>
              </div>
              
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    hover
                    className="p-4 cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    {/* Priority Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        variant={
                          task.priority === 'critical' ? 'error' :
                          task.priority === 'high' ? 'warning' :
                          task.priority === 'medium' ? 'info' : 'default'
                        }
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      {task.dueDate === 'Today' && (
                        <span className="text-xs text-orange-500 font-medium">Today</span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="font-medium text-gray-800 mb-1">{task.title}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {task.tags.map((tag: string) => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-pink-50">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={task.assignee.avatar}
                            alt={task.assignee.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-xs text-gray-600">{task.assignee.name}</span>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full',
                            task.assignee.type === 'human' ? 'bg-sky-100 text-sky-700' : 'bg-green-100 text-green-700'
                          )}>
                            {task.assignee.type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Task"
        description="Create a new task for humans or agents to complete"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-2xl border-2 border-pink-200 focus:border-pink-400 outline-none"
              placeholder="Task title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full px-4 py-2 rounded-2xl border-2 border-pink-200 focus:border-pink-400 outline-none resize-none h-24"
              placeholder="Describe the task..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="w-full px-4 py-2 rounded-2xl border-2 border-pink-200 focus:border-pink-400 outline-none bg-white">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 rounded-2xl border-2 border-pink-200 focus:border-pink-400 outline-none"
              />
            </div>
          </div>
          <Button className="w-full">Create Task</Button>
        </div>
      </Modal>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={selectedTask.title}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Badge 
                variant={
                  selectedTask.priority === 'critical' ? 'error' :
                  selectedTask.priority === 'high' ? 'warning' :
                  selectedTask.priority === 'medium' ? 'info' : 'default'
                }
              >
                {selectedTask.priority} priority
              </Badge>
              <Badge variant="default">{selectedTask.status.replace('_', ' ')}</Badge>
            </div>

            <p className="text-gray-700">{selectedTask.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Assignee</p>
                {selectedTask.assignee ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={selectedTask.assignee.avatar}
                      alt={selectedTask.assignee.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{selectedTask.assignee.name}</p>
                      <Badge variant={selectedTask.assignee.type === 'human' ? 'human' : 'agent'} className="text-xs">
                        {selectedTask.assignee.type}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">Unassigned</p>
                )}
              </div>
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Creator</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs',
                    selectedTask.creator.type === 'human' ? 'bg-sky-100' : 'bg-green-100'
                  )}>
                    {selectedTask.creator.type === 'human' ? '👤' : '🤖'}
                  </span>
                  <div>
                    <p className="font-medium">{selectedTask.creator.name}</p>
                    <Badge variant={selectedTask.creator.type === 'human' ? 'human' : 'agent'} className="text-xs">
                      {selectedTask.creator.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {selectedTask.status !== 'completed' && (
                <Button className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Task
                </Button>
              )}
              {selectedTask.status === 'published' && (
                <Button variant="secondary" className="flex-1">
                  Claim Task
                </Button>
              )}
              <Button variant="ghost">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
