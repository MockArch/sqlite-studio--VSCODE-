import os
import sys
from pathlib import Path
from collections import defaultdict

class InteractiveTreeExplorer:
    def __init__(self, root_path):
        self.root = Path(root_path)
        self.all_items = {}  # path -> {'type': 'file'/'folder', 'size': int, 'children': set, 'expanded': bool}
        self.selected = set()  # Selected items
        self.excluded = set()  # Excluded items
        self.current_view = []  # Current visible items
        self.build_structure()
        self.update_current_view()
    
    def build_structure(self):
        """Build the complete directory structure"""
        # Add all items (files and folders)
        for item in self.root.rglob('*'):
            relative_path = item.relative_to(self.root)
            
            if item.is_file():
                self.all_items[str(relative_path)] = {
                    'type': 'file', 
                    'size': item.stat().st_size,
                    'children': set(),
                    'expanded': False
                }
            elif item.is_dir():
                self.all_items[str(relative_path)] = {
                    'type': 'folder', 
                    'size': 0,
                    'children': set(),
                    'expanded': False
                }
        
        # Build parent-child relationships
        for path in self.all_items:
            path_obj = Path(path)
            if path_obj.parent != Path('.'):
                parent_path = str(path_obj.parent)
                if parent_path in self.all_items:
                    self.all_items[parent_path]['children'].add(path)
    
    def get_root_items(self):
        """Get items directly under root (depth 1)"""
        root_items = []
        for path, info in self.all_items.items():
            path_obj = Path(path)
            if len(path_obj.parts) == 1:  # Only direct children
                root_items.append(path)
        return sorted(root_items, key=lambda x: (self.all_items[x]['type'] == 'file', x.lower()))
    
    def update_current_view(self):
        """Update the current view based on expanded folders"""
        self.current_view = []
        root_items = self.get_root_items()
        
        for item in root_items:
            self._add_item_to_view(item, 0)
    
    def _add_item_to_view(self, item_path, depth):
        """Recursively add items to current view based on expansion state"""
        self.current_view.append((item_path, depth))
        
        item_info = self.all_items[item_path]
        if item_info['type'] == 'folder' and item_info['expanded']:
            children = sorted([child for child in item_info['children']], 
                            key=lambda x: (self.all_items[x]['type'] == 'file', x.lower()))
            for child in children:
                self._add_item_to_view(child, depth + 1)
    
    def display_current_view(self):
        """Display the current tree view with interactive options"""
        os.system('clear' if os.name == 'posix' else 'cls')  # Clear screen
        
        print("🔍 Interactive Code Aggregator")
        print("=" * 80)
        print(f"📂 Root: {self.root.absolute()}")
        print(f"✅ Selected: {len(self.selected)} | ❌ Excluded: {len(self.excluded)}")
        print("=" * 80)
        
        if not self.current_view:
            print("No items to display")
            return
        
        print("Current View:")
        print("-" * 60)
        
        for i, (item_path, depth) in enumerate(self.current_view, 1):
            item_info = self.all_items[item_path]
            indent = "  " * depth
            
            # Status indicators
            if item_path in self.selected:
                status = "✅"
            elif item_path in self.excluded:
                status = "❌"
            else:
                status = "  "
            
            # Item type and expansion indicator
            if item_info['type'] == 'folder':
                if item_info['expanded']:
                    icon = "📁▼"
                elif item_info['children']:
                    icon = "📁▶"
                else:
                    icon = "📁 "
                display_name = f"{Path(item_path).name}/"
            else:
                icon = "📄 "
                size_str = self._format_size(item_info['size'])
                display_name = f"{Path(item_path).name} ({size_str})"
            
            print(f"{i:2d}. {status} {indent}{icon} {display_name}")
        
        print("-" * 60)
        self._display_commands()
    
    def _display_commands(self):
        """Display available commands"""
        print("\n🎮 Commands:")
        print("  📁 e <num>     - Expand/collapse folder")
        print("  ✅ s <nums>    - Select items (e.g., 's 1,3-5')")
        print("  ❌ x <nums>    - Exclude items (e.g., 'x 2,4')")
        print("  🔄 c <nums>    - Clear selection/exclusion")
        print("  📋 show       - Show current selections")
        print("  ✨ done       - Finish and generate output")
        print("  ❓ help       - Show this help")
        print("  🚪 quit       - Exit without saving")
        print("\nFormat: <command> <numbers> (e.g., 's 1,3-5,7' or 'e 2')")
    
    def _format_size(self, size):
        """Format file size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f}{unit}" if size != int(size) else f"{int(size)}{unit}"
            size /= 1024
        return f"{size:.1f}TB"
    
    def parse_numbers(self, number_str):
        """Parse number string like '1,3-5,7' into list of indices"""
        if not number_str.strip():
            return []
        
        indices = []
        parts = number_str.split(',')
        
        for part in parts:
            part = part.strip()
            if '-' in part:
                try:
                    start, end = map(int, part.split('-'))
                    indices.extend(range(start, end + 1))
                except ValueError:
                    print(f"❌ Invalid range format: {part}")
                    continue
            else:
                try:
                    indices.append(int(part))
                except ValueError:
                    print(f"❌ Invalid number: {part}")
                    continue
        
        return sorted(list(set(indices)))
    
    def validate_indices(self, indices):
        """Validate and return valid indices within current view"""
        valid = []
        for idx in indices:
            if 1 <= idx <= len(self.current_view):
                valid.append(idx - 1)  # Convert to 0-based
            else:
                print(f"❌ Index {idx} is out of range (1-{len(self.current_view)})")
        return valid
    
    def get_item_and_children(self, item_path):
        """Get item and all its children recursively"""
        items = {item_path}
        if self.all_items[item_path]['type'] == 'folder':
            for child in self.all_items[item_path]['children']:
                items.update(self.get_item_and_children(child))
        return items
    
    def handle_command(self, command):
        """Handle user commands"""
        if not command.strip():
            return True
        
        parts = command.strip().split(maxsplit=1)
        cmd = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""
        
        if cmd in ['q', 'quit', 'exit']:
            return False
        
        elif cmd in ['h', 'help']:
            input("\nPress Enter to continue...")
            return True
        
        elif cmd == 'done':
            return self.finish_selection()
        
        elif cmd == 'show':
            self.show_selections()
            input("\nPress Enter to continue...")
            return True
        
        elif cmd in ['e', 'expand']:
            self.handle_expand(args)
            return True
        
        elif cmd in ['s', 'select']:
            self.handle_select(args)
            return True
        
        elif cmd in ['x', 'exclude']:
            self.handle_exclude(args)
            return True
        
        elif cmd in ['c', 'clear']:
            self.handle_clear(args)
            return True
        
        else:
            print(f"❌ Unknown command: {cmd}")
            input("Press Enter to continue...")
            return True
    
    def handle_expand(self, args):
        """Handle expand/collapse command"""
        indices = self.parse_numbers(args)
        valid_indices = self.validate_indices(indices)
        
        for idx in valid_indices:
            item_path, _ = self.current_view[idx]
            if self.all_items[item_path]['type'] == 'folder':
                self.all_items[item_path]['expanded'] = not self.all_items[item_path]['expanded']
                print(f"{'🔽' if self.all_items[item_path]['expanded'] else '▶️'} {item_path}")
            else:
                print(f"❌ Cannot expand file: {item_path}")
        
        self.update_current_view()
        if valid_indices:
            input("Press Enter to continue...")
    
    def handle_select(self, args):
        """Handle select command"""
        indices = self.parse_numbers(args)
        valid_indices = self.validate_indices(indices)
        
        for idx in valid_indices:
            item_path, _ = self.current_view[idx]
            affected_items = self.get_item_and_children(item_path)
            
            for item in affected_items:
                self.selected.add(item)
                self.excluded.discard(item)  # Remove from excluded if present
            
            print(f"✅ Selected: {item_path} (+{len(affected_items)} items)")
        
        if valid_indices:
            input("Press Enter to continue...")
    
    def handle_exclude(self, args):
        """Handle exclude command"""
        indices = self.parse_numbers(args)
        valid_indices = self.validate_indices(indices)
        
        for idx in valid_indices:
            item_path, _ = self.current_view[idx]
            affected_items = self.get_item_and_children(item_path)
            
            for item in affected_items:
                self.excluded.add(item)
                self.selected.discard(item)  # Remove from selected if present
            
            print(f"❌ Excluded: {item_path} (+{len(affected_items)} items)")
        
        if valid_indices:
            input("Press Enter to continue...")
    
    def handle_clear(self, args):
        """Handle clear selection command"""
        indices = self.parse_numbers(args)
        valid_indices = self.validate_indices(indices)
        
        for idx in valid_indices:
            item_path, _ = self.current_view[idx]
            affected_items = self.get_item_and_children(item_path)
            
            for item in affected_items:
                self.selected.discard(item)
                self.excluded.discard(item)
            
            print(f"🔄 Cleared: {item_path} (+{len(affected_items)} items)")
        
        if valid_indices:
            input("Press Enter to continue...")
    
    def show_selections(self):
        """Show current selections and exclusions"""
        print("\n📊 Current Selections:")
        print("=" * 50)
        
        if self.selected:
            print("✅ SELECTED:")
            for item in sorted(self.selected):
                if self.all_items[item]['type'] == 'file':
                    size_str = self._format_size(self.all_items[item]['size'])
                    print(f"   📄 {item} ({size_str})")
        else:
            print("✅ SELECTED: None")
        
        print()
        
        if self.excluded:
            print("❌ EXCLUDED:")
            for item in sorted(self.excluded):
                if self.all_items[item]['type'] == 'file':
                    size_str = self._format_size(self.all_items[item]['size'])
                    print(f"   📄 {item} ({size_str})")
        else:
            print("❌ EXCLUDED: None")
    
    def get_final_files(self):
        """Get final list of files to include"""
        final_files = set()
        
        # If nothing selected, include all files
        if not self.selected:
            for path, info in self.all_items.items():
                if info['type'] == 'file':
                    final_files.add(path)
        else:
            # Include only files from selected items
            for item in self.selected:
                if self.all_items[item]['type'] == 'file':
                    final_files.add(item)
        
        # Remove excluded files
        final_files = final_files - self.excluded
        
        return sorted(list(final_files))
    
    def finish_selection(self):
        """Finish selection and proceed to file generation"""
        final_files = self.get_final_files()
        
        if not final_files:
            print("❌ No files selected for output!")
            input("Press Enter to continue...")
            return True
        
        print(f"\n📋 Final Selection: {len(final_files)} files")
        print("=" * 60)
        
        total_size = 0
        for file_path in final_files:
            size = self.all_items[file_path]['size']
            total_size += size
            size_str = self._format_size(size)
            print(f"📄 {file_path} ({size_str})")
        
        print("-" * 60)
        print(f"📊 Total size: {self._format_size(total_size)}")
        
        while True:
            confirm = input(f"\n❓ Proceed with {len(final_files)} files? (y/n): ").strip().lower()
            if confirm in ['y', 'yes']:
                break
            elif confirm in ['n', 'no']:
                return True  # Continue editing
            else:
                print("Please enter 'y' or 'n'")
        
        # Get output filename
        while True:
            output_filename = input("\n📝 Enter output filename: ").strip()
            if output_filename:
                break
            print("Please enter a valid filename.")
        
        # Generate output
        self.create_combined_file(final_files, output_filename)
        return False  # Exit
    
    def create_combined_file(self, final_files, output_filename):
        """Create the combined output file"""
        output_path = self.root / output_filename
        
        try:
            with open(output_path, 'w', encoding='utf-8') as output_file:
                for i, file_path in enumerate(final_files):
                    full_path = self.root / file_path
                    
                    # Write the file header
                    output_file.write(f"// {file_path}\n\n")
                    
                    # Read and write file content
                    content = self.read_file_content(full_path)
                    output_file.write(content)
                    
                    # Add separator between files (except for the last file)
                    if i < len(final_files) - 1:
                        output_file.write(f"\n\n{'='*80}\n\n")
            
            print(f"\n✅ Successfully created: {output_filename}")
            print(f"📁 Location: {output_path.absolute()}")
            print(f"📊 Combined {len(final_files)} files")
            
        except Exception as e:
            print(f"❌ Error creating output file: {e}")
    
    def read_file_content(self, file_path):
        """Read file content with proper encoding handling"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception as e:
                return f"[Error reading file: {e}]"
        except Exception as e:
            return f"[Error reading file: {e}]"
    
    def run(self):
        """Main interactive loop"""
        print("🚀 Starting Interactive Mode...")
        print("📖 Tip: Start by expanding folders with 'e <num>', then select with 's <nums>'")
        input("\nPress Enter to continue...")
        
        while True:
            self.display_current_view()
            
            try:
                command = input("\n🎮 Enter command: ").strip()
                if not self.handle_command(command):
                    break
            except KeyboardInterrupt:
                print("\n\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
                input("Press Enter to continue...")

def main():
    print("🔍 Interactive Code Aggregator")
    print("=" * 50)
    
    # Get root directory
    while True:
        root_input = input("Enter root directory (or Enter for current): ").strip()
        
        if not root_input:
            root_path = Path.cwd()
        else:
            root_path = Path(root_input)
        
        if root_path.exists() and root_path.is_dir():
            break
        else:
            print("❌ Directory does not exist. Please try again.")
    
    print(f"📂 Scanning: {root_path.absolute()}")
    
    # Create and run interactive explorer
    explorer = InteractiveTreeExplorer(root_path)
    
    if not explorer.all_items:
        print("❌ No files found in directory.")
        return
    
    explorer.run()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Operation cancelled by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")