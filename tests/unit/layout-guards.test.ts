import { describe, expect, it } from 'vitest';
import {
  detectFloatingActionButtonIssue,
  detectPinnedTabBarIssue,
  findFloatingActionButtonIssues,
  findPinnedTabBarIssues,
} from '../../lib/layout-guards';

describe('detectPinnedTabBarIssue', () => {
  it('flags tab bars rendered inside ScrollView content', () => {
    const code = `
      export default function App() {
        return (
          <View style={styles.screen}>
            <ScrollView>
              <View style={styles.content} />
              <View style={styles.tabBar} />
            </ScrollView>
          </View>
        );
      }
    `;

    expect(detectPinnedTabBarIssue(code)).toContain('Bottom tab bar');
  });

  it('does not flag tab bars rendered outside ScrollView content', () => {
    const code = `
      export default function App() {
        return (
          <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.scrollContentWithTabs}>
              <View style={styles.content} />
            </ScrollView>
            <View style={styles.tabBar} />
          </View>
        );
      }
    `;

    expect(detectPinnedTabBarIssue(code)).toBeNull();
  });
});

describe('findPinnedTabBarIssues', () => {
  it('scans multiple generated files and returns the offending path', () => {
    const issues = findPinnedTabBarIssues([
      {
        path: 'App.jsx',
        content: `
          export default function App() {
            return (
              <View>
                <ScrollView><View style={styles.content} /></ScrollView>
                <View style={styles.tabBar} />
              </View>
            );
          }
        `,
      },
      {
        path: 'BrowseScreen.jsx',
        content: `
          export default function BrowseScreen() {
            return (
              <View>
                <ScrollView>
                  <View style={styles.content} />
                  <View style={styles.tabBar} />
                </ScrollView>
              </View>
            );
          }
        `,
      },
    ]);

    expect(issues).toEqual([
      {
        path: 'BrowseScreen.jsx',
        message: expect.stringContaining('Bottom tab bar'),
      },
    ]);
  });

  it('ignores non-code files and clean layouts', () => {
    const issues = findPinnedTabBarIssues([
      { path: 'logo.png', content: 'binary' },
      {
        path: 'App.jsx',
        content: `
          export default function App() {
            return (
              <View>
                <ScrollView><View style={styles.content} /></ScrollView>
                <View style={styles.tabBar} />
              </View>
            );
          }
        `,
      },
    ]);

    expect(issues).toEqual([]);
  });
});

describe('detectFloatingActionButtonIssue', () => {
  it('flags floating add buttons rendered inside ScrollView content', () => {
    const code = `
      export default function App() {
        return (
          <View style={styles.screen}>
            <ScrollView>
              <View style={styles.content} />
              <Pressable style={styles.fab}>
                <Text>+</Text>
              </Pressable>
            </ScrollView>
          </View>
        );
      }

      const styles = StyleSheet.create({
        fab: { width: 56, height: 56, borderRadius: 28 }
      });
    `;

    expect(detectFloatingActionButtonIssue(code)).toContain('inside ScrollView');
  });

  it('flags floating add buttons that are not absolutely anchored', () => {
    const code = `
      export default function App() {
        return (
          <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.scrollContentWithFab}>
              <View style={styles.content} />
            </ScrollView>
            <Pressable style={styles.fab}>
              <Text>Add</Text>
            </Pressable>
          </View>
        );
      }

      const styles = StyleSheet.create({
        fab: { width: 56, height: 56, borderRadius: 28 }
      });
    `;

    expect(detectFloatingActionButtonIssue(code)).toContain('not anchored');
  });

  it('does not flag correctly pinned floating add buttons', () => {
    const code = `
      export default function App() {
        return (
          <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.scrollContentWithFab}>
              <View style={styles.content} />
            </ScrollView>
            <Pressable style={styles.fab}>
              <Text>+</Text>
            </Pressable>
          </View>
        );
      }

      const styles = StyleSheet.create({
        fab: { position: 'absolute', bottom: 34, right: 20, width: 56, height: 56, borderRadius: 28 }
      });
    `;

    expect(detectFloatingActionButtonIssue(code)).toBeNull();
  });
});

describe('findFloatingActionButtonIssues', () => {
  it('scans multiple generated files and returns the offending fab file', () => {
    const issues = findFloatingActionButtonIssues([
      {
        path: 'App.jsx',
        content: `
          export default function App() {
            return (
              <View>
                <ScrollView><View style={styles.content} /></ScrollView>
                <Pressable style={styles.fab}><Text>+</Text></Pressable>
              </View>
            );
          }
          const styles = StyleSheet.create({
            fab: { position: 'absolute', bottom: 34, right: 20 }
          });
        `,
      },
      {
        path: 'TasksScreen.jsx',
        content: `
          export default function TasksScreen() {
            return (
              <View>
                <ScrollView>
                  <View style={styles.content} />
                  <Pressable style={styles.fab}><Text>+</Text></Pressable>
                </ScrollView>
              </View>
            );
          }
          const styles = StyleSheet.create({
            fab: { width: 56, height: 56 }
          });
        `,
      },
    ]);

    expect(issues).toEqual([
      {
        path: 'TasksScreen.jsx',
        message: expect.stringContaining('Floating add button'),
      },
    ]);
  });
});
